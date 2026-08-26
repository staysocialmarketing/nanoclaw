/**
 * Per-group MCP server config resolution.
 *
 * Group MCP servers are declared in registered_groups.container_config
 * (DB, host-controlled — not agent-writable). String values in `env` and
 * `headers` may reference host environment variables as ${VAR_NAME};
 * they are resolved here at container spawn time so the stored config
 * never contains secrets.
 *
 * A server whose placeholders cannot all be resolved is dropped (with a
 * warning) rather than passed through broken — an MCP server with empty
 * credentials fails in confusing ways inside the container.
 */
import { GroupMcpServerConfig } from './types.js';
import { logger } from './logger.js';

const PLACEHOLDER = /\$\{([A-Z0-9_]+)\}/g;

function expandValues(
  record: Record<string, string>,
  hostEnv: NodeJS.ProcessEnv,
  missing: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = value.replace(PLACEHOLDER, (_match, varName: string) => {
      const resolved = hostEnv[varName];
      if (resolved === undefined || resolved === '') {
        missing.push(varName);
        return '';
      }
      return resolved;
    });
  }
  return out;
}

export function resolveGroupMcpServers(
  configured: Record<string, GroupMcpServerConfig> | undefined,
  groupName: string,
  hostEnv: NodeJS.ProcessEnv = process.env,
): Record<string, GroupMcpServerConfig> | undefined {
  if (!configured || Object.keys(configured).length === 0) return undefined;

  const resolved: Record<string, GroupMcpServerConfig> = {};
  for (const [name, server] of Object.entries(configured)) {
    if (name === 'nanoclaw') {
      logger.warn(
        { group: groupName },
        'Group MCP server name "nanoclaw" is reserved, skipping',
      );
      continue;
    }
    const missing: string[] = [];
    if ('url' in server) {
      resolved[name] = {
        ...server,
        headers: server.headers
          ? expandValues(server.headers, hostEnv, missing)
          : undefined,
      };
    } else {
      resolved[name] = {
        ...server,
        env: server.env
          ? expandValues(server.env, hostEnv, missing)
          : undefined,
      };
    }
    if (missing.length > 0) {
      logger.warn(
        { group: groupName, server: name, missing },
        'MCP server dropped: unresolved host env variables',
      );
      delete resolved[name];
    }
  }
  return Object.keys(resolved).length > 0 ? resolved : undefined;
}
