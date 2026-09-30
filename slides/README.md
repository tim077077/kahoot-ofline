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

## Run it

```bash
npm install
cp .env.example .env.local    # add ANTHROPIC_API_KEY
npm run dev                   # http://localhost:3000
```

Without a key it runs in demo mode with example output.

```bash
npm test          # specs, text wrapping, API routes (demo mode)
npm run lint
npm run typecheck
```

## Copy a creator

**Instagram, by username.** Uses Instagram's official [Business Discovery API](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery). It reads the account's last 50 posts, ranks the carousels by likes + 3× comments, downloads the top 4 (first four slides and the last), and sends them to Claude with the feed's numbers. Roughly 30k input tokens of images per creator, so about $0.20–0.40 each at Opus prices (check the current pricing page).

It works on business and creator accounts only (not personal, private or age-restricted ones), and needs your own token. One-time setup, about 20 minutes:

1. Switch your Instagram to a professional (creator or business) account and link it to a Facebook Page.
2. At [developers.facebook.com](https://developers.facebook.com/apps) create an app (type Business) and add **Facebook Login for Business**. You're the app's admin, so it works in development mode with no App Review.
3. In the [Graph API Explorer](https://developers.facebook.com/tools/explorer/), pick your app, request `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, and generate a user token. Exchange it for a long-lived one (60 days) with the Access Token Debugger's "Extend" button.
4. Query `me/accounts?fields=instagram_business_account` in the Explorer; the `instagram_business_account.id` is your `IG_USER_ID`.
5. Put `IG_USER_ID` and `IG_ACCESS_TOKEN` in `.env.local` and restart. When the token expires the studio says so; repeat step 3.

**TikTok: post links and screenshots, not a username.** TikTok has no official way for an app to list someone else's posts (its Display API only covers your own account, and the Research API is for academic researchers). The only way to read a profile by name is scraping, which breaks TikTok's terms and breaks whenever they change the site, so the studio doesn't do it. Instead: open the creator's profile, sort by **Popular**, and paste 3–10 links to their top slideshows (each gives its cover slide and caption). Add a screenshot of their profile grid and Claude reads the view counts from it.

## How it's built

| Path | What it does |
|---|---|
| `src/lib/analyze.ts` | Screenshots → template spec (Claude vision, structured output) |
| `src/lib/creator.ts` | A creator's top posts → template spec + insights (streamed, structured output) |
| `src/lib/instagram.ts` | Instagram Business Discovery: read an account, rank its carousels, feed numbers |
| `src/lib/tiktok.ts` | TikTok oEmbed: a post's caption and cover |
| `src/lib/writer.ts` | Spec + topic → slides, caption, hashtags |
| `src/lib/spec.ts` | The spec schema, the curated formats, and colour/number sanitising |
| `src/lib/render.ts` | Draws any spec on canvas: wrap and auto-shrink, caption boxes, outline, shadow, Notes chrome |
| `src/components/Studio.tsx` | The studio screen |
| `src/lib/posting.ts` | Posting adapter. Only a demo poster for now |

All Claude calls use server-side refusal fallback (`fallbacks: "default"`).

## Posting to TikTok

"Send to TikTok drafts" is a demo that posts nothing. If this ever becomes a product, the real route is TikTok's official Content Posting API in draft mode (`MEDIA_UPLOAD`). It works without TikTok's audit, but needs a TikTok developer app (Login Kit, `video.upload`) and the slides hosted on a domain you've verified with TikTok. Never use unofficial or reverse-engineered posting.

## Notes

- Formats aren't copyrightable, but photos and exact text are. Copy the structure, use your own photos, and write your own words (that's what the writer does).
- Copied formats live in `localStorage`, so they're per browser. Export them if you switch machines.
