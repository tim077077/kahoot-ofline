# SlideDrop studio

A local tool that copies the **format** of any viral TikTok photo slideshow and makes one of your own.

1. **Copy a slideshow.** Screenshot 2–5 slides of a viral carousel and drop them in. Claude reads:
   - the look: text position, caption boxes, outline or shadow, font type, case, colours, photo or plain background
   - the writing formula: how the hook works, what each slide does, the tone, and how it ends

   Or paste the post's TikTok link: that gives the cover (usually the hook) and the caption. TikTok doesn't share the other slides with apps, so add a screenshot of a middle slide and the last one for a full copy.

   The result is saved to your format library (in your browser).
2. **Or copy a creator.** Type a creator's username and Claude reads their best slideshows at once: the format they keep reusing, their hook patterns, why their top posts beat their average, their topics and how often they post. The hook patterns are passed to the writer. See [Copy a creator](#copy-a-creator) for what each platform allows.
3. **Write.** Type a topic, and optionally a product to feature (Merry Paws, Mobilat…). Claude writes new slides in that exact formula. It copies the format, never the content.
4. **Finish.** Add your own background photos, tweak the look, edit any slide on the big phone preview, then download 1080×1920 PNGs as a ZIP with the caption.

It also ships with 10 hand-curated formats ("things I wish I knew", "apps that feel illegal to know", POV, rankings, Notes-app confessions…).

Around the studio there are four pages:

| Page | What it's for |
|---|---|
| **Dashboard** `/` | The post queue, what's set up and what isn't (with the fix for each), and how posts leave |
| **Studio** `/studio` | Copy a format, write, design, then "📤 Add to post queue" |
| **Viral finder** `/find` | Instagram's top carousels for a hashtag, and your TikTok swipe file. One click copies a format |
| **My posts** `/posts` | Type in each post's numbers; see what's working by format and by posting route; Claude reads your winners vs. losers |

## Start it on your PC

You need [Node.js](https://nodejs.org) 20.9 or newer (22 LTS is best) and git. Then, in a terminal:

```bash
git clone https://github.com/tim077077/kahoot-ofline.git
cd kahoot-ofline/slides
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
```

Open `.env.local` and paste your `ANTHROPIC_API_KEY`, or a Google key as `GEMINI_API_KEY` (see [Use a Google key](#use-a-google-gemini-key)). Without either, everything runs in demo mode with example output. Then:

```bash
npm run build && npm start      # http://localhost:3000
```

(`npm run dev` also works and reloads on code changes, but it's slower.) Or double-click `start.bat` (Windows) / run `./start.sh` (Mac, Linux): it installs, builds and starts in one go.

Everything is saved in `slides/.data/` (the queue, slides, swipe file, settings, TikTok login). Back that folder up; delete it to start fresh. Only `http://localhost:3000` works: opening it by your LAN IP or through a tunnel shows a 404 on purpose (see [Official TikTok drafts](#official-tiktok-drafts)).

```bash
npm test          # specs, text wrapping, queue, TikTok API client, API routes (demo mode)
npm run lint
npm run typecheck
```

## Use a Google (Gemini) key

Every AI feature (copying a format, the creator analyser, the writer, My posts) also runs on Google's Gemini. Get a key at [aistudio.google.com](https://aistudio.google.com/apikey) and put it in `.env.local`:

```bash
GEMINI_API_KEY=...            # GOOGLE_API_KEY works too
# GEMINI_MODEL=gemini-flash-latest
```

If both keys are set, Claude is used; `AI_PROVIDER=gemini` switches. The Dashboard shows which one is live and whether the key works.

Honest differences: the prompts were written and tuned on Claude, so Gemini's reading of layouts and its hooks may be weaker; compare the two on the same screenshots before trusting it. On Google's free tier, Google may use what you send to improve its products, and free-tier rate limits are low, so the creator analyser (many images) can hit them.

## Copy a creator

**Instagram, by username.** Uses Instagram's official [Business Discovery API](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery). It reads the account's last 50 posts, ranks the carousels by likes + 3× comments, downloads the top 4 (first four slides and the last), and sends them to Claude with the feed's numbers. Roughly 30k input tokens of images per creator, so about $0.20–0.40 each at Opus prices (check the current pricing page).

It works on business and creator accounts only (not personal, private or age-restricted ones), and needs your own token. One-time setup, about 20 minutes:

1. Switch your Instagram to a professional (creator or business) account and link it to a Facebook Page.
2. At [developers.facebook.com](https://developers.facebook.com/apps) create an app (type Business) and add **Facebook Login for Business**. You're the app's admin, so it works in development mode with no App Review.
3. In the [Graph API Explorer](https://developers.facebook.com/tools/explorer/), pick your app, request `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, and generate a user token. Exchange it for a long-lived one (60 days) with the Access Token Debugger's "Extend" button.
4. Query `me/accounts?fields=instagram_business_account` in the Explorer; the `instagram_business_account.id` is your `IG_USER_ID`.
5. Put `IG_USER_ID` and `IG_ACCESS_TOKEN` in `.env.local` and restart. When the token expires the studio says so; repeat step 3.

**TikTok: post links and screenshots, not a username.** TikTok has no official way for an app to list someone else's posts (its Display API only covers your own account, and the Research API is for academic researchers). The only way to read a profile by name is scraping, which breaks TikTok's terms and breaks whenever they change the site, so the studio doesn't do it. Instead: open the creator's profile, sort by **Popular**, and paste 3–10 links to their top slideshows (each gives its cover slide and caption). Add a screenshot of their profile grid and Claude reads the view counts from it.

## Viral finder

**Instagram hashtags (official).** Type a hashtag and you get Instagram's own "top" posts for it, carousels only, ranked by likes + 3× comments. "Copy format" sends the slides to Claude; "✨ What's winning in #tag" reads the top 4 together like a creator. It uses the same token as [Copy a creator](#copy-a-creator), plus the **Instagram Public Content Access** feature on your Meta app (App Dashboard → App Review → Permissions and Features; it may ask for review). Meta allows 30 different hashtags per 7 days, so results are kept for 6 hours.

**TikTok swipe file.** TikTok has no official search for apps, so you do the finding: "Search TikTok ↗" opens TikTok's photo search for your niche; paste the links of slideshows with big numbers. The cover and caption are saved locally, and "Copy format" works from there.

## My posts

About 48 hours after posting, open the post in the TikTok app → analytics and type the views, likes, comments, shares and saves into **My posts**. TikTok doesn't give apps photo-post stats, so this is by hand. You get averages by format and by posting route straight away; with 3+ measured posts, "✨ Analyse my posts" asks Claude what separates your winners from your losers, what to do more of and stop doing, and which hooks to test next.

## Posting: one queue, three ways out

Every slideshow you finish goes into the **post queue** (Studio → "📤 Add to post queue"). From the Dashboard each post leaves one of three ways, and they mix freely:

| Route | How | Sound | Setup |
|---|---|---|---|
| 📥 **Official drafts** | Lands in your TikTok inbox; you open the app, add a trending sound and post. Turn on **auto-save** and every new queued post goes straight to drafts | Any sound in the app (the best ones) | TikTok developer app + a tunnel (below) |
| ⚡ **Extension** | "Post via extension", then click "Post queued" in the panel on tiktok.com. Posts live | TikTok's smaller web library | Load the extension (below). **Against TikTok's terms** |
| ✋ **By hand** | "Download" gives slide-01.jpg… + caption.txt + title.txt. Post from your phone, then "✓ Mark posted" | Any | None |

Whatever the route, the post ends up in My posts.

### Official TikTok drafts

Uses TikTok's [Content Posting API](https://developers.tiktok.com/doc/content-posting-api-reference-photo-post) in draft mode (`MEDIA_UPLOAD`, scope `video.upload`). It works without TikTok's audit. TikTok *downloads* the slides from you, so your PC needs an https address TikTok can reach, on a domain you've verified with TikTok. One-time setup, about 45 minutes:

1. **A domain and a tunnel.** Put a domain you own on Cloudflare (free plan), install `cloudflared`, and create a named tunnel to `http://localhost:3000` on a subdomain, e.g. `slides.yourdomain.com`. The quick `trycloudflare.com` URLs change on every start, so they won't do.
2. **A TikTok app.** At [developers.tiktok.com](https://developers.tiktok.com) create an app, add **Login Kit** and **Content Posting API**, and request the `video.upload` scope. Redirect URI: `https://slides.yourdomain.com/api/tiktok/callback`. Under Content Posting API, verify the domain (or the URL prefix `https://slides.yourdomain.com/api/posts/`).
3. **`.env.local`:** `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `SLIDEDROP_PUBLIC_URL=https://slides.yourdomain.com`. Restart.
4. **Dashboard → Connect TikTok** (do it from `http://localhost:3000`). Log in with the account you post on.

What goes through the tunnel: only the slide images (each URL carries a signature, so nobody can list or guess your queue) and the login callback. Everything else, the dashboard included, answers 404 from outside.

Limits: TikTok allows 6 requests a minute and **at most 5 drafts waiting in your inbox per 24 hours**, and the app must be 31.8 or newer. TikTok can restrict apps it hasn't audited (for example to private posts); if a draft won't post publicly, that's why, and the fix is TikTok's app audit. The Dashboard turns TikTok's error codes into plain English.

### The extension

`slides/extension` is the SlideDrop Poster Chrome extension. Install and usage: [extension/README.md](extension/README.md). It uses TikTok's internal web-upload endpoints, which is against TikTok's terms: use a spare account first and don't post dozens a day.

## How it's built

| Path | What it does |
|---|---|
| `src/lib/ai.ts` | Picks Claude or Gemini and asks for a structured answer (same zod schema either way) |
| `src/lib/analyze.ts` | Screenshots → template spec (vision, structured output) |
| `src/lib/creator.ts` | A creator's top posts → template spec + insights (streamed, structured output) |
| `src/lib/instagram.ts` | Instagram Graph API: Business Discovery, hashtag top media, carousel ranking |
| `src/lib/tiktok.ts` | TikTok oEmbed: a post's caption and cover |
| `src/lib/writer.ts` | Spec + topic → slides, caption, hashtags |
| `src/lib/performance.ts` | My posts: averages by format/route, and the Claude winners-vs-losers report |
| `src/lib/spec.ts` | The spec schema, the curated formats, and colour/number sanitising |
| `src/lib/render.ts` | Draws any spec on canvas: wrap and auto-shrink, caption boxes, outline, shadow, Notes chrome |
| `src/lib/queue.ts` | The post queue on disk (`.data/posts/`) |
| `src/lib/tiktok-official.ts` | TikTok Login Kit + Content Posting API (drafts), signed slide URLs |
| `src/lib/posting.ts` | Settings and the drafts route (send, check status) |
| `src/lib/swipe.ts` | The TikTok swipe file |
| `src/proxy.ts` | Blocks everything from outside localhost except signed slides and the TikTok callback |
| `src/app/api/status` | The Dashboard's "What's working" checks |
| `src/components/` | Dashboard, Studio, Finder, Posts |
| `extension/` | The Chrome extension (posts the queue from tiktok.com) |

All Claude calls use server-side refusal fallback (`fallbacks: "default"`). Every write to the API needs an `x-slidedrop: 1` header, so other websites can't post to your queue from your browser.

## Notes

- Formats aren't copyrightable, but photos and exact text are. Copy the structure, use your own photos, and write your own words (that's what the writer does).
- Copied formats live in `localStorage`, so they're per browser. Export them if you switch machines.
