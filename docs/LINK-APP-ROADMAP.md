# Shared Link App — Deep Dive & Roadmap

*Working name: **Shelf** (placeholder — rename freely). Personal project for Corey + partner, designed so it can later help other couples/families.*

*Prepared September 2026. Sources are linked inline; the reference app's Play Store page itself was not reachable from this environment, so its details come from mirror listings and review excerpts.*

---

## 1. The problem we are solving

Two people send each other links all day: recipes, reels, things to buy, places to go, articles. Today those live in text threads, buried under everything else. The ask is simple:

> "Something we can easily share links with, outside of text and such."

That is **not** a bookmark manager problem. It is a **shared inbox for two people** problem. Every design decision below flows from that distinction. Bookmark managers optimize for one person hoarding thousands of links. We optimize for two people passing a handful of links a day back and forth and actually acting on them.

---

## 2. Deep dive: the reference app

**"My Links: Share, Save Links."** — `com.ldpgime_lucho.linksaver` (Android only)

| Fact | Value |
|------|-------|
| Rating | 4.62 / 5 from ~4.1k ratings |
| Installs | ~490k |
| Last update | Oct 29, 2025 |
| Monetization | Interstitial ads + premium subscription |
| Platforms | Android only. No iOS, no web. |

Sources: [AppBrain listing](https://www.appbrain.com/app/my-links-share-save-links/com.ldpgime_lucho.linksaver), [APKCombo](https://apkcombo.com/my-links-share-save-links/com.ldpgime_lucho.linksaver), [Play Store](https://play.google.com/store/apps/details?id=com.ldpgime_lucho.linksaver&hl=en_CA).

### What it does
- Save links into **custom folders / categories** (ships with three defaults: School, Work, Social)
- **Favorites** flag for quick access
- **Text-to-link converter** (paste a block of text, it pulls the URLs out)
- **In-app share** (send a link or a folder out to someone via the Android share sheet)
- **Search** across saved links

### Why your partner likes it (the parts to keep)
- It is *simple*. One screen, folders, links. No onboarding, no account.
- Folders are user-named. Organization matches how she thinks, not how the app thinks.
- Fast to find something again via search.
- Not aggressive about premium.

### Where it falls short (the parts to fix)

| Gap | Evidence | Why it matters for us |
|-----|----------|----------------------|
| **No shared space.** "Share" means *export out* via the share sheet. There is no folder two people both live in. | Feature list; no accounts/sync mentioned anywhere | This is the whole ask. Sharing out still lands in a text thread. |
| **Capture is clunky.** | Review: *"I have to look for it again and send it to my email to send it to this app. It's a lot of trouble doing it this way."* | Every extra tap at save-time kills the habit. Capture must be 1 tap from any app. |
| **No previews / context.** Links are bare URLs and titles. | Screenshots / listing | A TikTok or Amazon URL means nothing a week later. Thumbnails, summaries, price. |
| **Text corruption bug.** | Review: *"the letters wind up scrambled"* | Quality bar. |
| **Ads.** | Reviews: *"a moderate amount of ads, enough where I mind them"* | We own it, so no ads, ever. |
| **Android only.** | Listing | If either of you is on iPhone the app cannot be shared at all. |
| **No backup / export.** Data lives on one phone. | Listing | Lose the phone, lose the links. |
| **Wrong default categories.** School / Work / Social. | Listing | A couple's categories are *To buy*, *To try*, *To watch*, *Places*, *Kids*... |
| **No "done" state.** | Feature list | Links pile up forever. The reason people abandon bookmark tools. |

---

## 3. What the market teaches (2025–2026)

**Pocket died.** Mozilla shut it down July 8, 2025; 20M+ users, 2B+ saved items, all deleted after November 2025. ([TechCrunch](https://techcrunch.com/2026/08/14/read-it-later-app-pocket-is-shutting-down-here-are-the-best-alternatives/)) Lesson: **own the data**. Export must be one tap and always free.

**Raindrop tightened the free tier in 2026.** Collection cap dropped to 5, AI tagging and full-text search moved behind Pro ($3–4/mo). Users describe its sharing model as "awkward" and its Android app as "mostly a share sheet". ([Marqly review](https://www.marqly.com/blog/raindrop-review-2026), [ContextBolt pricing](https://contextbolt.com/blog/raindrop-pricing/)) Lesson: the couple/sharing use case is under-served even by the market leader.

**Karakeep is the open-source benchmark.** Share-sheet capture, auto metadata, LLM auto-tagging and summaries (cloud or local Ollama), full-text + semantic search, page archiving, iOS/Android apps, rule engine, AGPL. ([GitHub](https://github.com/karakeep-app/karakeep)) Lesson: the feature bar for "smart" is now: **auto-tag, summarize, find-by-description**. Copy the patterns, not the product.

**Linkwarden** = collaboration + archival (screenshot, PDF, readable copy, Wayback push). **Linkding** = radical simplicity. ([SelfHostPicks comparison](https://selfhostpicks.com/linkwarden-vs-karakeep-vs-linkding/))

**The abandonment pattern.** ~70% of saved links are never revisited; ~30% are dead within three years; people cycle through four managers and end up with a "graveyard you scroll past on the way to the address bar." ([Linkamatic](https://linkamatic.com/blog/why-bookmarks-fail), [ContextBolt on link rot](https://contextbolt.com/blog/link-rot/)) Lesson: **"saving is solved; answering is not."** The app has to make links *resolve*: seen, tried, bought, done.

**Telegram bots are a proven zero-install capture path.** MarkIt, Marklog, DingDrop all do "forward a link, get it tagged and summarized." ([MarkIt](https://mark-it.co/guides/telegram-link-saver-bot)) You already run Telegram bots through NanoClaw.

---

## 4. Product thesis

**Shelf is a shared inbox for links between people who live together.**

The core loop, in order of importance:

1. **Capture in one tap** from any app (share sheet, bot, shortcut). Under 3 seconds, no form.
2. **It lands in a shared feed** with a real preview (thumbnail, title, summary, price, recipe card, video length).
3. **The other person gets a gentle nudge**, not a text.
4. **React and resolve**: ❤️ / 👀 seen / ✅ done / 🛒 bought / comment. Resolved links leave the feed and go to the archive.
5. **Find it later by describing it**: "that patio set she sent in May" works, even if the page is gone.

Everything else (folders, tags, collections) is secondary and mostly automatic.

### Design principles
- **Capture over curation.** Never ask a question at save time. Enrich after.
- **Intent over topic.** Default buckets are verbs (*Try*, *Buy*, *Watch*, *Read*, *Go*), not nouns (School, Work).
- **Nothing dies.** Every link gets a readable snapshot + screenshot within minutes of saving.
- **Two-person first, N-person ready.** Spaces with members from day one, even though the first space has two members.
- **Own the data.** One-tap export (JSON + Netscape HTML), no ads, no subscription for your own use.
- **AI does chores, not features.** Tagging, summarizing, deduping, dead-link checking, weekly digests. Invisible.

---

## 5. Improvements over the reference app (feature list)

### Capture (the make-or-break layer)
- **Android share sheet** target (native) — 1 tap, optional "note" field, done.
- **iOS share extension** (native) — same. *PWAs cannot be share targets on iOS, so this needs a real app.* ([MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target), [MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide))
- **Telegram bot capture via NanoClaw** — forward anything to the bot; it saves, tags, summarizes, and confirms. Works before any app is installed.
- **iOS Shortcut / Android HTTP Shortcut** posting to a webhook — the day-one capture path that needs zero app store involvement. ([Linkding shortcut example](https://gist.github.com/andrewdolphin/a7dff49505e588d940bec55132fab8ad))
- **Email-in address** (`save@…`) — forward newsletters and emails.
- **Clipboard detection** on app open ("Save the link you just copied?").
- **Paste a wall of text → extract all URLs** (keeps the one feature the reference app does uniquely well).
- **Browser extension** (later).

### Preview & enrichment
- Open Graph / Twitter Card / oEmbed extraction (title, description, image, site, author). Library: [unfurl](https://github.com/jacktuck/unfurl) or [open-graph-scraper](https://www.npmjs.com/package/open-graph-scraper).
- **Platform-aware cards**: YouTube (duration, channel), TikTok (oEmbed), Instagram (oEmbed is tokenless again since June 2026 — [Spotlight](https://spotlightwp.com/instagram-embed-wordpress/)), Amazon/shop pages (price, image), recipes (schema.org Recipe → ingredients + time), Google Maps (place + rating).
- **Readable snapshot** via [Defuddle](https://github.com/kepano/defuddle) (Markdown) + **screenshot** via the headless Chromium already in the NanoClaw container. Stored in Supabase Storage. Link rot becomes irrelevant.
- **URL normalization + dedupe**: strip `utm_*`/`fbclid`, resolve `vm.tiktok.com`/`youtu.be`/`a.co` short links, canonical URL match, "you both saved this" merge.

### Organization that does itself
- **Intent buckets** (Try / Buy / Watch / Read / Go / Other) predicted by AI, correctable in one tap.
- **AI tags + one-line summary** on every save (Claude via the existing Anthropic key / OneCLI).
- **Collections** (manual, e.g. "Kitchen reno", "Summer trip") that either person can add to.
- **Favorites / pin**, drag to reorder inside a collection.
- **Reminders**: "remind me Friday", "remind us when we're near this place" (later).

### Shared-space features (the differentiator)
- **Spaces** with members. Personal space + shared space(s). Invite by link.
- **Feed with unread state** per person: "3 new from Sarah".
- **Reactions + short comments** on a link (replaces the "did you see this?" text).
- **Resolve states**: Seen → Done / Bought / Tried / Skipped. Resolved links leave the feed.
- **Push notification** on partner's save (batched, quiet hours respected).
- **Weekly digest** (NanoClaw scheduled task): "5 links you two saved this week and haven't opened."

### Search that answers
- Full-text over title, summary, snapshot text, tags, notes.
- **Semantic search** with pgvector embeddings: "that blue couch" finds the IKEA page.
- Filters: who saved it, bucket, site, date, resolved/unresolved.
- Ask-the-library (later): "what restaurants have we saved in Halifax?"

### Trust & ownership
- No ads. No paywall for your own data.
- One-tap export: JSON + Netscape bookmark HTML (imports into Raindrop, Karakeep, browsers).
- Import from Pocket export, Raindrop, Chrome/Safari HTML, plain text.
- Dead-link checker (scheduled) with "archived copy available" badge.
- Row Level Security so a space is only visible to its members.

---

## 6. Architecture

Matches the stack you already run (HUB = Vite + React + TS + shadcn + Supabase + Vercel; NanoClaw on Telegram; Anthropic via OneCLI), so nothing new to learn or pay for.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ CAPTURE                                                                  │
│  Android/iOS app share sheet ─┐                                          │
│  Telegram bot (NanoClaw)      ├──▶ POST /save (Supabase Edge Function)   │
│  iOS Shortcut / HTTP Shortcut ┤        • auth (JWT or space API key)     │
│  Web app / PWA / email-in     ┘        • normalize URL, dedupe           │
│                                        • insert link (status: pending)   │
├──────────────────────────────────────────────────────────────────────────┤
│ ENRICH (async, fire-and-forget)                                          │
│  Edge Function "enrich" or NanoClaw agent task                           │
│    • unfurl OG/oEmbed  • platform card (YT/TikTok/IG/recipe/shop)        │
│    • Defuddle snapshot → Storage  • screenshot → Storage                 │
│    • Claude: bucket + tags + 1-line summary  • embedding → pgvector      │
├──────────────────────────────────────────────────────────────────────────┤
│ STORE  Supabase Postgres + RLS + Storage + Realtime                      │
├──────────────────────────────────────────────────────────────────────────┤
│ USE                                                                      │
│  Expo app (iOS + Android)  •  Web app on Vercel (same design system)     │
│  Realtime feed  •  Push (Expo Notifications)                             │
├──────────────────────────────────────────────────────────────────────────┤
│ CHORES  NanoClaw scheduled tasks                                         │
│  nightly dead-link check • weekly digest • re-enrich failures            │
│  keep Supabase free tier awake (pauses after 7 idle days)                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Stack decisions

| Layer | Choice | Why |
|-------|--------|-----|
| Mobile | **Expo (React Native)** + expo-router + [expo-share-intent](https://github.com/achorein/expo-share-intent) | Same React/TS skills as HUB; one codebase for both phones; share-sheet on both platforms. |
| Web | Vite + React + shadcn (or Expo web) on Vercel | Reuse HUB components. PWA doubles as Android share target. |
| Backend | **Supabase**: Postgres, Auth, RLS, Storage, Edge Functions, Realtime, pgvector | Already in your stack. RLS makes spaces safe by construction. |
| AI | Claude via OneCLI-injected key | Already in your stack. Tagging/summaries are cheap on Haiku/Sonnet. |
| Snapshots | Defuddle + headless Chromium | Chromium already lives in the NanoClaw agent container. |
| Bot capture | NanoClaw Telegram channel | Already running. Add a `links` group / skill. |
| Push | Expo Notifications | Free, works on both platforms. |

**Alternative considered: self-host Karakeep and skin it.** Fastest path to "smart bookmarks," but it is a single-user-hoarder product under AGPL, its couple/feed UX would be a fork-fight, and it does not become something you can turn into a product. Use it as a reference implementation instead.

**Alternative considered: PWA only.** Fine for Android and for web, but iOS cannot share *into* a PWA. If either phone is an iPhone, a native app is required for the one-tap capture loop. Bridge the gap with an iOS Shortcut until the app ships.

### Data model (sketch)

```sql
spaces          (id, name, kind: 'personal'|'shared', created_by, created_at)
space_members   (space_id, user_id, role: 'owner'|'member', joined_at)
space_invites   (id, space_id, token, expires_at, created_by)

links           (id, space_id, saved_by, url, canonical_url, url_hash,
                 title, description, site_name, image_url, favicon_url,
                 kind: 'article'|'video'|'product'|'recipe'|'place'|'social'|'other',
                 bucket: 'try'|'buy'|'watch'|'read'|'go'|'other',
                 summary, note, price_cents, currency, duration_sec,
                 status: 'pending'|'ready'|'failed',
                 resolved: null|'done'|'bought'|'tried'|'skipped', resolved_by, resolved_at,
                 is_favorite, created_at, updated_at)
link_snapshots  (link_id, markdown_path, screenshot_path, http_status, checked_at, is_dead)
link_embeddings (link_id, embedding vector(1024))
tags            (id, space_id, name)            link_tags (link_id, tag_id, source: 'ai'|'user')
collections     (id, space_id, name, emoji)     collection_links (collection_id, link_id, position)
link_seen       (link_id, user_id, seen_at)
reactions       (link_id, user_id, emoji, created_at)
comments        (id, link_id, user_id, body, created_at)
reminders       (id, link_id, user_id, remind_at, sent_at)
api_keys        (id, space_id, user_id, key_hash, label)   -- for shortcuts / bot
```

RLS rule of thumb: every table with `space_id` gets `space_id IN (select space_id from space_members where user_id = auth.uid())`.

### NanoClaw integration (what changes in this repo)

Small and skill-shaped, per the repo philosophy:

1. **`links` group** (or reuse `telegram_main`) whose `CLAUDE.md` teaches the agent: when a message contains a URL, `POST` it to the Shelf save endpoint with the space API key (injected via OneCLI, never in the prompt), then reply with the enriched card.
2. **Scheduled tasks**: nightly dead-link check, weekly digest to the couple's Telegram group, free-tier keep-alive ping.
3. Optionally a **`/add-shelf` skill** later so other NanoClaw users can wire their own instance in.

No core-file changes are needed. This is a consumer of NanoClaw, not a modification of it.

---

## 7. Distribution reality check

- **Google Play, personal accounts created after Nov 2023:** production access requires a closed test with **12 testers opted in for 14 continuous days**. ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)) For a two-person app, skip the store: distribute the APK directly / EAS internal distribution.
- **iOS:** Apple Developer Program **$99/yr**; TestFlight covers up to 100 internal / 10,000 external testers, which is plenty for family and friends before any App Store listing.
- **Expo EAS free tier:** 15 Android + 15 iOS builds/month, free OTA updates. Enough for this project. ([Expo billing](https://docs.expo.dev/billing/plans/))
- **Supabase free tier:** 500 MB DB, 1 GB storage, 2 projects, **pauses after 7 idle days**. Either run it on the existing HUB Pro org, or let a NanoClaw scheduled task keep it warm. ([Supabase pricing guide](https://uibakery.io/blog/supabase-pricing))

---

## 8. Roadmap

### Phase 0 — Capture-first spike (week 1)
Goal: partner is saving links into a shared feed by day 3, with no app installed.

- [ ] Decide: phones (iOS/Android), name, new Supabase project vs HUB org
- [ ] Supabase schema + RLS (tables above, minimum: spaces, members, links, tags)
- [ ] Edge Function `POST /save` (API key auth, URL normalize, dedupe, insert pending)
- [ ] Edge Function `enrich` (unfurl OG/oEmbed, Claude bucket+tags+summary)
- [ ] NanoClaw: `links` group CLAUDE.md so forwarding a link to the Telegram bot saves it
- [ ] iOS Shortcut + Android "HTTP Shortcuts" recipe pointing at `/save`
- [ ] Throwaway web feed page (Vite + shadcn) showing the shared space
- [ ] Export endpoint (JSON) from day one

**Exit:** both of you have saved 20+ real links; you know which capture path she actually uses.

### Phase 1 — Native app v0.1 (weeks 2–4)
Goal: one-tap share-sheet save on both phones; the feed is the new "did you see this?".

- [ ] Expo app scaffold, Supabase auth (magic link + Apple/Google)
- [ ] `expo-share-intent` share target (URL + optional note), iOS share extension
- [ ] Feed: previews, "new from X" unread state, pull to refresh, Realtime
- [ ] Link detail: preview, summary, tags, note, open, copy, share out
- [ ] Buckets (Try/Buy/Watch/Read/Go) + favorites + basic search
- [ ] Resolve states + reactions
- [ ] Push notification on partner save (batched)
- [ ] EAS builds; TestFlight + direct APK to both phones

**Exit:** links between the two of you stop going through text messages.

### Phase 2 — Smart & durable (weeks 5–8)
Goal: nothing is lost, everything is findable.

- [ ] Snapshots: Defuddle markdown + screenshot → Storage; "archived copy" viewer
- [ ] Platform cards: YouTube, TikTok, Instagram, recipe schema, product price, Maps
- [ ] pgvector embeddings + semantic search; filters (who/bucket/site/date/resolved)
- [ ] Dedupe merge UI ("you both saved this")
- [ ] NanoClaw scheduled tasks: nightly dead-link check, weekly digest, keep-alive
- [ ] Collections (manual) with shared editing
- [ ] Import: Pocket export, Raindrop, browser HTML, plain text

**Exit:** a six-month-old link is findable by description and readable even if the page is gone.

### Phase 3 — Daily-driver polish (weeks 9–12)
- [ ] Offline cache of feed + snapshots
- [ ] Home-screen widget (latest from partner / "Buy" list)
- [ ] Reminders ("remind me Friday"), quiet hours
- [ ] Comments on links
- [ ] Clipboard detection, paste-text URL extractor, email-in address
- [ ] Browser extension (Chrome/Safari) reusing the `/save` endpoint
- [ ] Netscape HTML export, account deletion, data download

### Phase 4 — Help others (when it has earned it)
- [ ] Multi-space UX (kids, in-laws, friends trip)
- [ ] Invite-by-link onboarding for a new couple in under 60 seconds
- [ ] Public read-only collection pages ("our Halifax favourites")
- [ ] Open-source the repo (MIT) with a self-host guide; `/add-shelf` NanoClaw skill
- [ ] Store release plan: Play closed testing (12 testers × 14 days), App Store review
- [ ] Optional hosted tier: free for one shared space, small yearly fee for unlimited spaces + AI. No ads, ever.

---

## 9. Success metrics

| Metric | Target |
|--------|--------|
| Time from "share" tap to confirmation | < 3 s |
| Links per week saved into the shared space | ≥ 10 (i.e. it replaced texting) |
| Partner opens a new link within 48 h | ≥ 70% |
| Links resolved (done/bought/tried) within 30 days | ≥ 50% |
| Saves that needed manual re-categorization | < 20% |
| Dead links with a working archived copy | 100% |

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Instagram/TikTok/Amazon block scrapers | oEmbed first, then screenshot fallback; the card degrades to title + screenshot, never to a bare URL. |
| iPhone in the mix → native app required for share sheet | Shortcut-to-webhook bridges day 1; Expo native app in Phase 1. |
| Supabase free project pauses | Run on HUB Pro org or NanoClaw keep-alive task. |
| Scope creep into "full bookmark manager" | The feed + resolve loop is the product. Anything that doesn't serve two people acting on links waits for Phase 4. |
| AI tagging cost | Haiku-class model, ~1 call per save, cached prompts; pennies per month at couple scale. |
| It becomes a graveyard | Resolve states, weekly digest, and "unresolved for 30 days" auto-archive keep the feed short. |

---

## 11. Decisions needed before Phase 0

1. **Phones:** iOS, Android, or one of each? (Determines whether Phase 1 needs the Apple Developer Program.)
2. **Name.** "Shelf" is a placeholder.
3. **Supabase home:** new free project, or a schema in the existing HUB Pro org?
4. **Bot capture:** reuse the existing Telegram bot in a new couple group, or a dedicated bot?
5. **Open-source from day one, or after Phase 2?**

---

## Appendix: competitor feature matrix

| | My Links (ref) | Raindrop | Karakeep | Linkwarden | **Shelf (target)** |
|---|---|---|---|---|---|
| Shared space between people | ✗ | Pro (3 collab free) | Lists | ✓ | **✓ core** |
| Share-sheet capture | ✓ Android | ✓ | ✓ iOS+Android | ✓ | **✓ both + bot + shortcut** |
| Rich previews | ✗ | ✓ | ✓ | ✓ | **✓ + platform cards** |
| AI tags / summary | ✗ | Pro | ✓ (local OK) | ✗ | **✓ automatic** |
| Semantic search | ✗ | Stella (Pro) | ✓ | ✗ | **✓** |
| Page archive | ✗ | Pro | ✓ | ✓ | **✓ automatic** |
| Resolve / done state | ✗ | ✗ | ✗ | ✗ | **✓ core** |
| Reactions / comments | ✗ | ✗ | ✗ | ✗ | **✓** |
| Dead-link check | ✗ | Pro | ✗ | ✗ | **✓ scheduled** |
| Export | ✗ | ✓ | ✓ | ✓ | **✓ one tap** |
| Ads | ✓ | ✗ | ✗ | ✗ | **never** |
| iOS + Android + web | Android | ✓ | ✓ | ✓ | **✓** |
