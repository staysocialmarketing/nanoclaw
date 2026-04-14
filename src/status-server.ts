/**
 * Agent Status Server
 *
 * Lightweight read-only HTTP endpoint on localhost:3456.
 * Returns live agent activity as JSON so the HUB can poll it.
 *
 * Agents with multiple contexts (e.g. Lev on personal + team Telegram)
 * are merged into a single entry with a `channels` array.
 *
 * Intentionally zero-dependency — uses Node's built-in `http` module.
 * No auth needed: binds to 127.0.0.1 only.
 */
import http from 'http';

import { logger } from './logger.js';

const STATUS_PORT = 3456;

export type AgentStatusValue = 'processing' | 'idle' | 'sleeping';

// Priority for aggregating channel statuses into a single agent status
const STATUS_PRIORITY: Record<AgentStatusValue, number> = {
  processing: 3,
  idle: 2,
  sleeping: 1,
};

// Internal per-folder state
interface FolderState {
  folder: string;
  agentName: string;
  status: AgentStatusValue;
  currentTask: string | null;
  lastActive: string | null;
  channelType: string; // e.g. "telegram"
}

// Shape returned by the endpoint
interface ChannelStatus {
  id: string; // folder name, e.g. "telegram_main"
  label: string; // human label, e.g. "personal" or "team"
  status: AgentStatusValue;
  currentTask: string | null;
  lastActive: string | null;
}

interface AgentStatus {
  id: string; // lowercased agent name, e.g. "lev"
  name: string; // display name, e.g. "Lev"
  status: AgentStatusValue; // highest-priority status across channels
  currentTask: string | null; // from whichever channel is active
  lastActive: string | null; // most recent across channels
  channels: ChannelStatus[];
}

/**
 * Derive the channel type from a folder name.
 * "telegram_main" → "telegram"
 */
function deriveChannelType(folder: string): string {
  return folder.split('_')[0] ?? 'unknown';
}

/**
 * Derive a human label from the folder suffix.
 * "telegram_main" → "personal", "telegram_team" → "team"
 */
function deriveLabel(folder: string): string {
  const parts = folder.split('_');
  const suffix = parts.slice(1).join('_') || folder;
  return suffix === 'main' ? 'personal' : suffix;
}

class StatusTracker {
  private folders = new Map<string, FolderState>();

  register(folder: string, agentName: string): void {
    if (!this.folders.has(folder)) {
      this.folders.set(folder, {
        folder,
        agentName,
        status: 'sleeping',
        currentTask: null,
        lastActive: null,
        channelType: deriveChannelType(folder),
      });
    }
  }

  setProcessing(folder: string, agentName: string, task: string): void {
    const prev = this.folders.get(folder);
    this.folders.set(folder, {
      folder,
      agentName,
      status: 'processing',
      currentTask: task,
      lastActive: new Date().toISOString(),
      channelType: prev?.channelType ?? deriveChannelType(folder),
    });
  }

  setIdle(folder: string): void {
    const state = this.folders.get(folder);
    if (state) {
      state.status = 'idle';
      state.currentTask = null;
      state.lastActive = new Date().toISOString();
    }
  }

  setSleeping(folder: string): void {
    const state = this.folders.get(folder);
    if (state) {
      state.status = 'sleeping';
      state.currentTask = null;
    }
  }

  snapshot(): { agents: AgentStatus[]; timestamp: string } {
    // Group folders by agent name
    const byAgent = new Map<string, FolderState[]>();
    for (const state of this.folders.values()) {
      const key = state.agentName.toLowerCase();
      const group = byAgent.get(key);
      if (group) {
        group.push(state);
      } else {
        byAgent.set(key, [state]);
      }
    }

    const agents: AgentStatus[] = [];

    for (const [agentId, states] of byAgent) {
      // Aggregate status: highest priority wins
      const topStatus = states.reduce<AgentStatusValue>((best, s) => {
        return STATUS_PRIORITY[s.status] > STATUS_PRIORITY[best]
          ? s.status
          : best;
      }, 'sleeping');

      // Current task: from whichever channel is processing, else null
      const processing = states.find((s) => s.status === 'processing');
      const currentTask = processing?.currentTask ?? null;

      // Last active: most recent across channels
      const lastActive = states.reduce<string | null>((latest, s) => {
        if (!s.lastActive) return latest;
        if (!latest) return s.lastActive;
        return s.lastActive > latest ? s.lastActive : latest;
      }, null);

      const channels: ChannelStatus[] = states.map((s) => ({
        id: s.folder,
        label: deriveLabel(s.folder),
        status: s.status,
        currentTask: s.currentTask,
        lastActive: s.lastActive,
      }));

      agents.push({
        id: agentId,
        name: states[0].agentName,
        status: topStatus,
        currentTask,
        lastActive,
        channels,
      });
    }

    return { agents, timestamp: new Date().toISOString() };
  }
}

export const statusTracker = new StatusTracker();

export function startStatusServer(): void {
  const server = http.createServer((req, res) => {
    // CORS — allow the HUB to fetch from the browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(statusTracker.snapshot(), null, 2));
      return;
    }

    res.writeHead(405);
    res.end('Method not allowed');
  });

  server.listen(STATUS_PORT, '127.0.0.1', () => {
    logger.info({ port: STATUS_PORT }, 'Status server listening');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(
        { port: STATUS_PORT },
        'Status server port already in use — skipping',
      );
    } else {
      logger.warn({ err }, 'Status server error');
    }
  });
}
