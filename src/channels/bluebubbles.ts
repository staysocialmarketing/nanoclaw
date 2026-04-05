import { randomUUID } from 'crypto';

import { readEnvFile } from '../env.js';
import { logger } from '../logger.js';
import { Channel, NewMessage, OnChatMetadata, OnInboundMessage } from '../types.js';
import { ChannelOpts, registerChannel } from './registry.js';

// JID format: {chatGuid}@bluebubbles
// chatGuid examples: "iMessage;-;+15551234567" (DM), "iMessage;+;{uuid}" (group)
const JID_SUFFIX = '@bluebubbles';
const POLL_MS = 3000;

// Overlap applied to every query: we look back this many ms before lastPollMs
// to guard against clock skew between Node.js and the BlueBubbles server.
// GUID deduplication prevents re-delivering messages in the overlap window.
const POLL_OVERLAP_MS = 3000;

// How long to suppress echo-backs of messages we sent.
// In a self-chat (Private API off), iMessage delivers every sent message
// back as an isFromMe=false copy. We track sent texts for this window so
// those echo-backs don't re-trigger the agent.
const SENT_ECHO_WINDOW_MS = 90_000;

// On startup, look back this far to catch messages sent while the service
// was restarting. storeMessage uses INSERT OR REPLACE so duplicates are safe;
// the agent cursor won't re-process already-seen messages.
const STARTUP_LOOKBACK_MS = 5 * 60 * 1000;

// Cap on how many GUIDs we keep in the seen-set before pruning.
const MAX_SEEN_GUIDS = 2000;

function toJid(chatGuid: string): string {
  return `${chatGuid}${JID_SUFFIX}`;
}

function fromJid(jid: string): string {
  return jid.slice(0, -JID_SUFFIX.length);
}

interface BBMessage {
  guid: string;
  text: string | null;
  isFromMe: boolean;
  dateCreated: number; // ms since epoch
  handle?: {
    address: string;
    firstName?: string;
    lastName?: string;
  };
  chats?: Array<{ guid: string; displayName?: string }>;
}

interface BBResponse<T> {
  status: number;
  message: string;
  data: T;
}

class BlueBubblesChannel implements Channel {
  readonly name = 'bluebubbles';
  private connected = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastPollMs: number = Date.now() - STARTUP_LOOKBACK_MS;

  // GUID dedup: prevents re-delivering messages that fall in the overlap window
  private readonly seenGuids = new Set<string>();

  // Map<text, sentAtMs>: suppresses self-chat echo-backs of our own messages
  private readonly recentlySent = new Map<string, number>();

  constructor(
    private readonly baseUrl: string,
    private readonly password: string,
    private readonly onMessage: OnInboundMessage,
    private readonly onChatMetadata: OnChatMetadata,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${sep}password=${encodeURIComponent(this.password)}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`BlueBubbles ${res.status}: ${text}`);
    }
    return res.json() as T;
  }

  async connect(): Promise<void> {
    await this.request<BBResponse<unknown>>('/api/v1/server/info');
    this.connected = true;
    logger.info({ url: this.baseUrl }, 'BlueBubbles channel connected');

    this.pollTimer = setInterval(() => {
      this.poll().catch((err) =>
        logger.warn({ err }, 'BlueBubbles: poll error'),
      );
    }, POLL_MS);
  }

  private isSentEcho(text: string): boolean {
    const sentAt = this.recentlySent.get(text);
    if (sentAt === undefined) return false;
    return Date.now() - sentAt < SENT_ECHO_WINDOW_MS;
  }

  private purgeStaleCache(): void {
    const cutoff = Date.now() - SENT_ECHO_WINDOW_MS;
    for (const [text, ts] of this.recentlySent) {
      if (ts < cutoff) this.recentlySent.delete(text);
    }
    if (this.seenGuids.size > MAX_SEEN_GUIDS) {
      const arr = [...this.seenGuids];
      this.seenGuids.clear();
      for (const g of arr.slice(-MAX_SEEN_GUIDS / 2)) this.seenGuids.add(g);
    }
  }

  private async poll(): Promise<void> {
    if (!this.connected) return;

    this.purgeStaleCache();

    // Query with a backward overlap to handle clock skew between Node.js
    // and the BlueBubbles server. GUID dedup handles the resulting duplicates.
    const after = this.lastPollMs - POLL_OVERLAP_MS;
    this.lastPollMs = Date.now();

    const res = await this.request<BBResponse<BBMessage[]>>(
      '/api/v1/message/query',
      {
        method: 'POST',
        body: JSON.stringify({
          limit: 50,
          sort: 'ASC',
          after,
          with: ['chats', 'handles'],
        }),
      },
    );

    for (const msg of res.data ?? []) {
      if (
        msg.isFromMe ||
        !msg.text ||
        this.seenGuids.has(msg.guid) ||
        this.isSentEcho(msg.text)
      ) {
        continue;
      }
      this.seenGuids.add(msg.guid);
      this.deliver(msg);
    }
  }

  private deliver(msg: BBMessage): void {
    const chatGuid = msg.chats?.[0]?.guid;
    if (!chatGuid) return;

    const jid = toJid(chatGuid);
    const sender = msg.handle?.address ?? 'unknown';
    const firstName = msg.handle?.firstName ?? '';
    const lastName = msg.handle?.lastName ?? '';
    const senderName =
      [firstName, lastName].filter(Boolean).join(' ') || sender;
    const chatName = msg.chats?.[0]?.displayName ?? chatGuid;
    const timestamp = new Date(msg.dateCreated).toISOString();

    this.onChatMetadata(jid, timestamp, chatName, 'bluebubbles', false);

    const message: NewMessage = {
      id: msg.guid,
      chat_jid: jid,
      sender,
      sender_name: senderName,
      content: msg.text!,
      timestamp,
      is_from_me: false,
    };

    this.onMessage(jid, message);
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    const chatGuid = fromJid(jid);
    await this.request<BBResponse<unknown>>('/api/v1/message/text', {
      method: 'POST',
      body: JSON.stringify({
        chatGuid,
        message: text,
        method: 'apple-script',
        tempGuid: randomUUID(),
      }),
    });
    // Record the sent text so the self-chat echo-back is suppressed in poll()
    this.recentlySent.set(text, Date.now());
  }

  isConnected(): boolean {
    return this.connected;
  }

  ownsJid(jid: string): boolean {
    return jid.endsWith(JID_SUFFIX);
  }

  async disconnect(): Promise<void> {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.connected = false;
    logger.info('BlueBubbles channel disconnected');
  }
}

registerChannel('bluebubbles', (opts: ChannelOpts): BlueBubblesChannel | null => {
  const env = readEnvFile(['BLUEBUBBLES_URL', 'BLUEBUBBLES_PASSWORD']);
  const url = process.env.BLUEBUBBLES_URL ?? env.BLUEBUBBLES_URL;
  const password = process.env.BLUEBUBBLES_PASSWORD ?? env.BLUEBUBBLES_PASSWORD;

  if (!url || !password) return null;

  return new BlueBubblesChannel(url, password, opts.onMessage, opts.onChatMetadata);
});
