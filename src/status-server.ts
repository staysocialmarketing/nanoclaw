/**
 * Agent Status Server
 *
 * Two responsibilities:
 *   1. Local HTTP endpoint on localhost:3456 — read-only, for the HUB browser poll.
 *   2. Push loop — POSTs agent status to the HUB edge function every 5 seconds.
 *
 * Agents with multiple contexts (e.g. Lev on personal + team Telegram) are merged
 * into a single entry. Scout and Quill are virtual sub-agents whose status is
 * derived from what Lev is currently doing.
 */
import http from 'http';

import { AGENT_BRIDGE_API_KEY, HUB_PUSH_URL } from './config.js';
import { logger } from './logger.js';

const STATUS_PORT = 3456;
const HUB_PUSH_INTERVAL_MS = 5000;

// ─── Internal tracker types ───────────────────────────────────────────────────

export type AgentStatusValue = 'processing' | 'idle' | 'sleeping';

const STATUS_PRIORITY: Record<AgentStatusValue, number> = {
  processing: 3,
  idle: 2,
  sleeping: 1,
};

interface FolderState {
  folder: string;
  agentName: string;
  status: AgentStatusValue;
  currentTask: string | null;
  lastActive: string | null;
  channelType: string;
}

// ─── Local endpoint types ─────────────────────────────────────────────────────

interface ChannelStatus {
  id: string;
  label: string;
  status: AgentStatusValue;
  currentTask: string | null;
  lastActive: string | null;
}

interface AgentStatus {
  id: string;
  name: string;
  status: AgentStatusValue;
  currentTask: string | null;
  lastActive: string | null;
  channels: ChannelStatus[];
}

// ─── HUB push types ───────────────────────────────────────────────────────────

type HubStatus = 'active' | 'idle' | 'processing' | 'offline';

interface HubAgent {
  id: string;
  name: string;
  role: string;
  status: HubStatus;
  task: string | null;
}

// Static agent roster pushed to the HUB
const AGENT_ROLES: Record<string, { name: string; role: string }> = {
  lev: { name: 'Lev', role: 'Operations Manager' },
  scout: { name: 'Scout', role: 'Research Agent' },
  quill: { name: 'Quill', role: 'Copywriting Agent' },
};

// ─── Keyword patterns for sub-agent derivation ────────────────────────────────

const RESEARCH_RE =
  /research|find|search|look up|investigate|analy[sz]e|check/i;
const WRITING_RE = /write|draft|caption|content|post|email|copy/i;
const MEETING_RE = /meet|brief|sync|strategy|board|session|call/i;

function deriveSubAgents(
  levStatus: HubStatus,
  levTask: string | null,
): { scout: HubAgent; quill: HubAgent } {
  const scout: HubAgent = {
    ...AGENT_ROLES.scout,
    id: 'scout',
    status: 'idle',
    task: null,
  };
  const quill: HubAgent = {
    ...AGENT_ROLES.quill,
    id: 'quill',
    status: 'idle',
    task: null,
  };

  if (levStatus === 'processing' && levTask) {
    if (RESEARCH_RE.test(levTask)) {
      scout.status = 'processing';
      scout.task = `Researching: ${levTask}`;
    } else if (WRITING_RE.test(levTask)) {
      quill.status = 'processing';
      quill.task = `Drafting: ${levTask}`;
    } else if (MEETING_RE.test(levTask)) {
      scout.status = 'active';
      scout.task = 'In session with Lev';
      quill.status = 'active';
      quill.task = 'In session with Lev';
    }
  }

  return { scout, quill };
}

// ─── Status tracker ───────────────────────────────────────────────────────────

function deriveChannelType(folder: string): string {
  return folder.split('_')[0] ?? 'unknown';
}

function deriveLabel(folder: string): string {
  const suffix = folder.split('_').slice(1).join('_') || folder;
  return suffix === 'main' ? 'personal' : suffix;
}

function mapToHubStatus(status: AgentStatusValue): HubStatus {
  switch (status) {
    case 'processing':
      return 'processing';
    case 'idle':
      return 'idle';
    case 'sleeping':
      return 'offline';
  }
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

  /** Full snapshot for the local HTTP endpoint. */
  snapshot(): { agents: AgentStatus[]; timestamp: string } {
    const byAgent = new Map<string, FolderState[]>();
    for (const state of this.folders.values()) {
      const key = state.agentName.toLowerCase();
      const group = byAgent.get(key);
      if (group) group.push(state);
      else byAgent.set(key, [state]);
    }

    const agents: AgentStatus[] = [];
    for (const [agentId, states] of byAgent) {
      const topStatus = states.reduce<AgentStatusValue>(
        (best, s) =>
          STATUS_PRIORITY[s.status] > STATUS_PRIORITY[best] ? s.status : best,
        'sleeping',
      );
      const processing = states.find((s) => s.status === 'processing');
      const currentTask = processing?.currentTask ?? null;
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
      agents.push({ id: agentId, name: states[0].agentName, status: topStatus, currentTask, lastActive, channels });
    }
    return { agents, timestamp: new Date().toISOString() };
  }

  /** HUB push payload — Lev + derived Scout/Quill. */
  hubPayload(): { agents: HubAgent[] } {
    const { agents } = this.snapshot();
    const lev = agents.find((a) => a.id === 'lev');
    const levHubStatus = lev ? mapToHubStatus(lev.status) : 'offline';
    const levTask = lev?.currentTask ?? null;
    const { scout, quill } = deriveSubAgents(levHubStatus, levTask);

    return {
      agents: [
        { id: 'lev', ...AGENT_ROLES.lev, status: levHubStatus, task: levTask },
        scout,
        quill,
      ],
    };
  }
}

export const statusTracker = new StatusTracker();

// ─── HUB push loop ────────────────────────────────────────────────────────────

function startHubPush(): void {
  if (!AGENT_BRIDGE_API_KEY) {
    logger.warn('AGENT_BRIDGE_API_KEY not set — HUB status push disabled');
    return;
  }

  const push = async () => {
    try {
      const payload = statusTracker.hubPayload();
      const res = await fetch(HUB_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': AGENT_BRIDGE_API_KEY,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        logger.warn(
          { status: res.status, url: HUB_PUSH_URL },
          'HUB status push failed',
        );
      }
    } catch (err) {
      logger.warn({ err }, 'HUB status push error');
    }
  };

  setInterval(push, HUB_PUSH_INTERVAL_MS);
  logger.info({ url: HUB_PUSH_URL, intervalMs: HUB_PUSH_INTERVAL_MS }, 'HUB status push started');
}

// ─── Local HTTP server ────────────────────────────────────────────────────────

export function startStatusServer(): void {
  const server = http.createServer((req, res) => {
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

  startHubPush();
}
