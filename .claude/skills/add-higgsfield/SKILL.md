---
name: add-higgsfield
description: Give a NanoClaw agent (e.g. Lev) access to Higgsfield AI image/video generation via the Higgsfield MCP server. Use when the user wants agents to generate images or videos with Higgsfield, or asks to set up Higgsfield MCP access. Triggers on "higgsfield", "add higgsfield", "higgsfield mcp".
---

# Add Higgsfield MCP Access

Connects a group's agent container to Higgsfield AI (image/video generation:
Soul, Cinema Studio, Kling, Veo, and other models) through Higgsfield's MCP
server, using per-group MCP server configuration.

## Prerequisites

- Higgsfield account with API credentials. Get an API key and secret from
  https://cloud.higgsfield.ai/api-keys (paid Higgsfield plans include API
  credits; generations consume credits).
- NanoClaw running with per-group MCP support (`scripts/set-group-mcp.ts`
  exists — merged from the `claude/higgsfield-mcp-access-0lepj8` branch).

## Setup

### Step 1: Store the credentials

Add to the host `.env` (or the OneCLI vault if `/init-onecli` is in use —
then export them into the NanoClaw service environment):

```
HIGGSFIELD_API_KEY=hf_...
HIGGSFIELD_SECRET=...
```

Keys are resolved on the host at container spawn time and passed only to
the MCP transport — they are never stored in the database and never appear
in the mounted group folder or run logs.

### Step 2: Attach the server to a group

Use `AskUserQuestion` to confirm which groups should get access (default:
`lev` and `telegram_main` — the Lev/Opus groups), then for each:

```bash
npx tsx scripts/set-group-mcp.ts lev config-examples/mcp-servers-higgsfield.json
npx tsx scripts/set-group-mcp.ts telegram_main config-examples/mcp-servers-higgsfield.json
```

### Step 3: Restart NanoClaw

```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw   # macOS
systemctl --user restart nanoclaw                  # Linux
```

### Step 4: Verify

Message the agent (e.g. "Lev, list your Higgsfield tools"). The container
log for the run should show `Group MCP servers attached` with
`servers: ["higgsfield"]`, and the agent should see `mcp__higgsfield__*`
tools.

### Step 5: Teach the agent

Add a short section to the group's `groups/<folder>/CLAUDE.md` so the agent
knows the capability exists, e.g.:

```markdown
## Higgsfield (image & video generation)

You have `mcp__higgsfield__*` tools for generating images and videos
(client content, ads, social posts). Generations consume Higgsfield
credits — confirm with Corey before large batches.
```

## Troubleshooting

- **"MCP server dropped: unresolved host env variables"** in the NanoClaw
  log — `HIGGSFIELD_API_KEY` / `HIGGSFIELD_SECRET` are not visible to the
  NanoClaw process. Check `.env` and restart the service.
- **Auth errors from the server** — Higgsfield's hosted MCP endpoint may
  require account OAuth instead of API-key headers depending on plan. If
  header auth is rejected, check https://higgsfield.ai/mcp for the current
  connection method; the config in
  `config-examples/mcp-servers-higgsfield.json` can be updated to whatever
  transport/auth they document (any `type: http|sse|stdio` server works).
- **Tools not visible to the agent** — confirm the group folder name passed
  to `set-group-mcp.ts` matches `registered_groups.folder` exactly
  (`--list` shows the current config), and that NanoClaw was restarted.
