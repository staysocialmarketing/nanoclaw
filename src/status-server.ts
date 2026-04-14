/**
 * Agent Status Server
 *
 * Lightweight read-only HTTP endpoint on localhost:3456.
 * Returns live agent activity as JSON so the HUB can poll it.
 *
 * Intentionally zero-dependency — uses Node's built-in `http` module.
 * No auth needed: binds to 127.0.0.1 only.
 */
import http from 'http';

import { logger } from './logger.js';

const STATUS_PORT = 3456;

export type AgentStatusValue = 'processing' | 'idle' | 'sleeping';

interface AgentStatus {
  id: string;
  name: string;
  status: AgentStatusValue;
  currentTask: string | null;
  lastActive: string | null;
  channel: string;
}

function deriveChannel(folder: string): string {
  return folder.split('_')[0] ?? 'unknown';
}

class StatusTracker {
  private agents = new Map<string, AgentStatus>();

  register(folder: string, agentName: string): void {
    if (!this.agents.has(folder)) {
      this.agents.set(folder, {
        id: folder,
        name: agentName,
        status: 'sleeping',
        currentTask: null,
        lastActive: null,
        channel: deriveChannel(folder),
      });
    }
  }

  setProcessing(folder: string, agentName: string, task: string): void {
    const prev = this.agents.get(folder);
    this.agents.set(folder, {
      id: folder,
      name: agentName,
      status: 'processing',
      currentTask: task,
      lastActive: new Date().toISOString(),
      channel: prev?.channel ?? deriveChannel(folder),
    });
  }

  setIdle(folder: string): void {
    const agent = this.agents.get(folder);
    if (agent) {
      agent.status = 'idle';
      agent.currentTask = null;
      agent.lastActive = new Date().toISOString();
    }
  }

  setSleeping(folder: string): void {
    const agent = this.agents.get(folder);
    if (agent) {
      agent.status = 'sleeping';
      agent.currentTask = null;
    }
  }

  snapshot(): { agents: AgentStatus[]; timestamp: string } {
    return {
      agents: Array.from(this.agents.values()),
      timestamp: new Date().toISOString(),
    };
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
      logger.warn({ port: STATUS_PORT }, 'Status server port already in use — skipping');
    } else {
      logger.warn({ err }, 'Status server error');
    }
  });
}
