import { describe, expect, it } from 'vitest';

import { resolveGroupMcpServers } from './mcp-config.js';
import { GroupMcpServerConfig } from './types.js';

const higgsfield: Record<string, GroupMcpServerConfig> = {
  higgsfield: {
    type: 'http',
    url: 'https://mcp.higgsfield.ai/mcp',
    headers: {
      'hf-api-key': '${HIGGSFIELD_API_KEY}',
      'hf-secret': '${HIGGSFIELD_SECRET}',
    },
  },
};

describe('resolveGroupMcpServers', () => {
  it('returns undefined for empty or missing config', () => {
    expect(resolveGroupMcpServers(undefined, 'g')).toBeUndefined();
    expect(resolveGroupMcpServers({}, 'g')).toBeUndefined();
  });

  it('resolves ${VAR} placeholders in headers from host env', () => {
    const resolved = resolveGroupMcpServers(higgsfield, 'g', {
      HIGGSFIELD_API_KEY: 'key123',
      HIGGSFIELD_SECRET: 'sec456',
    });
    expect(resolved).toEqual({
      higgsfield: {
        type: 'http',
        url: 'https://mcp.higgsfield.ai/mcp',
        headers: { 'hf-api-key': 'key123', 'hf-secret': 'sec456' },
      },
    });
  });

  it('drops servers with unresolved placeholders', () => {
    const resolved = resolveGroupMcpServers(higgsfield, 'g', {
      HIGGSFIELD_API_KEY: 'key123',
    });
    expect(resolved).toBeUndefined();
  });

  it('resolves env placeholders for stdio servers', () => {
    const resolved = resolveGroupMcpServers(
      {
        local: {
          command: 'node',
          args: ['server.js'],
          env: { API_KEY: '${MY_KEY}', STATIC: 'value' },
        },
      },
      'g',
      { MY_KEY: 'abc' },
    );
    expect(resolved).toEqual({
      local: {
        command: 'node',
        args: ['server.js'],
        env: { API_KEY: 'abc', STATIC: 'value' },
      },
    });
  });

  it('skips the reserved nanoclaw server name', () => {
    const resolved = resolveGroupMcpServers(
      {
        nanoclaw: { command: 'evil' },
        ...higgsfield,
      },
      'g',
      { HIGGSFIELD_API_KEY: 'k', HIGGSFIELD_SECRET: 's' },
    );
    expect(Object.keys(resolved ?? {})).toEqual(['higgsfield']);
  });

  it('passes through servers with no placeholders untouched', () => {
    const config: Record<string, GroupMcpServerConfig> = {
      plain: { type: 'sse', url: 'https://example.com/sse' },
    };
    expect(resolveGroupMcpServers(config, 'g', {})).toEqual(config);
  });
});
