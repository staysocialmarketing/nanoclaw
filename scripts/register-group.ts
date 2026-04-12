#!/usr/bin/env tsx
/**
 * Register a chat group with NanoClaw.
 *
 * Usage:
 *   tsx scripts/register-group.ts <chat-id> <folder> <name> [trigger]
 *
 * Examples:
 *   tsx scripts/register-group.ts tg:-1002345678901 telegram_team "Stay Social Team"
 *   tsx scripts/register-group.ts tg:-1002345678901 telegram_team "Stay Social Team" "@Lev"
 *
 * Arguments:
 *   chat-id   Platform chat ID (e.g. tg:-1002345678901 for Telegram)
 *   folder    Subfolder name under groups/ (e.g. telegram_team)
 *   name      Human-readable display name (quote if it contains spaces)
 *   trigger   Trigger word/phrase (default: @Lev from ASSISTANT_NAME in .env)
 *
 * After running this script, restart NanoClaw to pick up the new group.
 */
import { initDatabase, setRegisteredGroup } from '../src/db.js';
import { DEFAULT_TRIGGER } from '../src/config.js';

const args = process.argv.slice(2);
const chatId = args[0];
const folder = args[1];
// Name can be multi-word if quoted; trigger is last arg only if it starts with @
const lastArg = args[args.length - 1];
const hasTrigger = args.length >= 4 && lastArg.startsWith('@');
const trigger = hasTrigger ? lastArg : DEFAULT_TRIGGER;
const nameArgs = hasTrigger ? args.slice(2, -1) : args.slice(2);
const name = nameArgs.join(' ');

if (!chatId || !folder || !name) {
  console.error('Usage: tsx scripts/register-group.ts <chat-id> <folder> <name> [trigger]');
  console.error('');
  console.error('  chat-id   e.g. tg:-1002345678901');
  console.error('  folder    e.g. telegram_team');
  console.error('  name      e.g. "Stay Social Team"');
  console.error('  trigger   e.g. "@Lev"  (default: ' + DEFAULT_TRIGGER + ')');
  process.exit(1);
}

initDatabase();

setRegisteredGroup(chatId, {
  name,
  folder,
  trigger,
  added_at: new Date().toISOString(),
  requiresTrigger: true,
});

console.log(`\nRegistered group:`);
console.log(`  Name:    ${name}`);
console.log(`  Chat ID: ${chatId}`);
console.log(`  Folder:  groups/${folder}/`);
console.log(`  Trigger: ${trigger}`);
console.log(`\nRestart NanoClaw to pick up the new group:`);
console.log(`  launchctl kickstart -k gui/$(id -u)/com.nanoclaw`);
