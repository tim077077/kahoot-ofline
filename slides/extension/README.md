# SlideDrop Poster (Chrome extension)

Posts the SlideDrop queue to TikTok from your logged-in tiktok.com tab. It uses the same internal endpoints as TikTok's own web uploader. No API key, no developer app.

**This is against TikTok's terms.** Try it on a spare account first, keep the gap between posts at 45 seconds or more, and don't post dozens a day. If TikTok shows a captcha or checkpoint, solve it yourself in the tab; the extension doesn't get around it.

## Install (once)

1. Chrome → `chrome://extensions` → turn on **Developer mode** (top right).
2. **Load unpacked** → pick the `slides/extension` folder.
3. Start SlideDrop (`npm start` in `slides/`), then open or refresh tiktok.com while logged in. A "SlideDrop · Post to TikTok" panel appears bottom-right.

## Post the queue

1. In the SlideDrop Dashboard, click **⚡ Post via extension** on the posts you want out.
2. In the tiktok.com panel, the **SlideDrop queue** section lists them (↻ to refresh; it also checks every minute while the tab is open). If SlideDrop runs somewhere other than `http://localhost:3000`, change the address there.
3. Click **Post queued (N)**. It posts them one by one, waiting the gap you set on the Dashboard (with some randomness), and reports each one back. Nothing posts without that click.

Posted ones move to "Recently posted" on the Dashboard with their TikTok link; failed ones show the error and can be reset.

The panel's old buttons still work for one-offs: type a title and caption, then **Pick slides & post**, or **Pick a folder & post all** for folders of `slide-*.png` + `caption.txt` + `title.txt`.

## Limits

- Sounds come from TikTok's smaller web library ("Add a sound" on the Dashboard picks the top recommended one). For a specific trending sound, use the official drafts route or post by hand. You can't add a sound after a photo post is published.
- Photo carousels only.
- If TikTok changes its internal endpoints, posting fails until the extension is updated from a fresh Network-tab capture.

## What it can reach

The extension only talks to tiktok.com, TikTok's upload CDN, and three SlideDrop addresses on localhost: the queue list, the result report, and the slide images. Nothing else on your PC or the web.
