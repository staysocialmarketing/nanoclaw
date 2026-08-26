#!/usr/bin/env tsx
/**
 * Attach or remove MCP servers for a registered group.
 *
 * Usage:
 *   tsx scripts/set-group-mcp.ts <folder> <config-file.json>   # merge servers from file
 *   tsx scripts/set-group-mcp.ts <folder> --remove <server>    # remove one server
 *   tsx scripts/set-group-mcp.ts <folder> --list               # show current servers
 *
 * The config file maps server name -> MCP server config, e.g.:
 *   {
 *     "higgsfield": {
 *       "type": "http",
 *       "url": "https://mcp.higgsfield.ai/mcp",
 *       "headers": {
 *         "hf-api-key": "${HIGGSFIELD_API_KEY}",
 *         "hf-secret": "${HIGGSFIELD_SECRET}"
 *       }
 *     }
 *   }
 *
 * ${VAR} placeholders are resolved from the host's environment (.env) at
 * container spawn time — real keys are never stored in the database.
 * After running this script, restart NanoClaw to pick up the change.
 */
import fs from 'fs';

import { getAllRegisteredGroups, initDatabase, setRegisteredGroup } from '../src/db.js';
import { GroupMcpServerConfig } from '../src/types.js';

const [folder, action, extra] = process.argv.slice(2);

if (!folder || !action) {
  console.error('Usage: tsx scripts/set-group-mcp.ts <folder> <config-file.json | --remove <server> | --list>');
  process.exit(1);
}

initDatabase();

const groups = getAllRegisteredGroups();
const entry = Object.entries(groups).find(([, g]) => g.folder === folder);
if (!entry) {
  console.error(`No registered group with folder "${folder}".`);
  console.error(`Known folders: ${[...new Set(Object.values(groups).map((g) => g.folder))].join(', ')}`);
  process.exit(1);
}
const [jid, group] = entry;
const current = group.containerConfig?.mcpServers ?? {};

if (action === '--list') {
  console.log(JSON.stringify(current, null, 2));
  process.exit(0);
}

let next: Record<string, GroupMcpServerConfig>;
if (action === '--remove') {
  if (!extra || !(extra in current)) {
    console.error(`Server "${extra}" not configured for ${folder}. Configured: ${Object.keys(current).join(', ') || '(none)'}`);
    process.exit(1);
  }
  next = { ...current };
  delete next[extra];
} else {
  const parsed = JSON.parse(fs.readFileSync(action, 'utf-8')) as Record<string, GroupMcpServerConfig>;
  next = { ...current, ...parsed };
}

setRegisteredGroup(jid, {
  ...group,
  containerConfig: {
    ...group.containerConfig,
    mcpServers: Object.keys(next).length > 0 ? next : undefined,
  },
});

console.log(`MCP servers for ${folder}: ${Object.keys(next).join(', ') || '(none)'}`);
console.log('Restart NanoClaw to apply:');
console.log('  launchctl kickstart -k gui/$(id -u)/com.nanoclaw   # macOS');
console.log('  systemctl --user restart nanoclaw                  # Linux');
