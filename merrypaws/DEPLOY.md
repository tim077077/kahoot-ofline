# Put it online (about 2 hours)

Everything runs on Cloudflare: the app, the hourly reminder timer and photo storage. Portraits come straight from Google.

**What it costs:**

- Cloudflare, Upstash, R2 and Resend: $0. Their free plans cover a friends test and the first thousands of users.
- Google: about $0.037 per portrait try, billed as you go.
- A domain: about $10 a year, needed so the backup emails reach people.
- Later, not now: Apple's $99 a year only when you put the app on the App Store, and Cloudflare Workers Paid ($5 a month) once you pass 5,000 previews a month or 100,000 requests a day.

When you're done, open `https://your-site/api/health` on your phone. Every line should say `true`.

## 1. The site: Cloudflare Workers

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com). The free plan is enough. Previews are watermarked by Cloudflare's Images service (5,000 a month free), so they fit the free plan's 10 ms of CPU per request.
2. **Workers & Pages → Create → Import a repository** and connect GitHub. Pick the repo. Then set:

   | Setting | Value |
   |---|---|
   | Project name | `paw-pictures` (it must match `name` in `wrangler.jsonc`) |
   | Root directory | `merrypaws`, if it's still inside `kahoot-ofline` |
   | Build command | `npx opennextjs-cloudflare build` |
   | Deploy command | `npx opennextjs-cloudflare deploy` |

3. Don't deploy yet. Add the variables from the steps below first. There are two kinds:
   - **Build variables** (Settings → Build → Variables): everything starting with `NEXT_PUBLIC_`. They're baked into the app when it builds, so a change needs a new build.
   - **Secrets** (Settings → Variables and Secrets, type *Secret*): everything else.
4. Deploy. You get a `paw-pictures.<you>.workers.dev` address. A custom domain goes under **Settings → Domains & Routes**.

Every push to the branch deploys again by itself.

**From your own computer instead:** `npx wrangler login`, put the `NEXT_PUBLIC_` values in `.env.production.local`, add each secret with `npx wrangler secret put NAME`, then `npm run cf:deploy`. To try the production build locally first, put secrets in `.dev.vars` and run `npm run cf:preview`.

## 2. The database: Upstash Redis

1. [console.upstash.com](https://console.upstash.com) → **Create database** → Redis, free plan. Pick the region closest to your users.
2. From the database page, under **REST API**, add these secrets:

   | Secret | Value |
   |---|---|
   | `UPSTASH_REDIS_REST_URL` | the REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | the REST token |

## 3. Photo storage: Cloudflare R2

1. In the same Cloudflare account: **R2** → create a bucket called `paw-pictures`. The first 10 GB are free.
2. **R2 → Manage API tokens → Create token**, with **Object Read & Write** on that bucket.
3. Add these secrets:

   | Secret | Value |
   |---|---|
   | `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
   | `S3_BUCKET` | `paw-pictures` |
   | `S3_ACCESS_KEY_ID` | from the token |
   | `S3_SECRET_ACCESS_KEY` | from the token |
   | `S3_REGION` | `auto` |

4. Bucket → **Settings → CORS policy**, so the app can show and draw the photos:

   ```json
   [{ "AllowedOrigins": ["*"], "AllowedMethods": ["GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
   ```

   Paste it exactly: R2 rejects placeholder origins like `<you>`. `*` is safe here because the bucket stays private and every photo link is signed and expires; this only lets the browser read a link it was already given. To tighten it later, replace `*` with your real address (for example `https://paw-pictures.timoteiculda07.workers.dev`, shown under **Workers & Pages → Subdomain**).

5. Bucket → **Settings → Object lifecycle rules → Add rule**: prefix `portraits/`, delete objects after 30 days. Finished portraits can only be unlocked for 30 days, so they shouldn't be kept longer. Don't add a rule for the whole bucket: that would delete album photos.

## 4. Portraits: Google Gemini API

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key**.
2. Turn on billing for that key's project (AI Studio shows a **Set up billing** link). Image models have no free tier, so without billing every portrait fails.
3. In [Google Cloud Billing → Budgets & alerts](https://console.cloud.google.com/billing), set a budget of about $20 a month with email alerts. That's your early warning if something gets abused.
4. Add the secret `GEMINI_API_KEY`.

The model is Nano Banana 2.1 (`gemini-nano-banana-2.1`), at $0.0336 an image plus about $0.003 for the photo going in. When it errors, Nano Banana 2 (`gemini-3.1-flash-image`) takes over. On a paid key, Google doesn't use the photos to train its models.

## 5. Backup emails: Resend

1. Sign up at [resend.com](https://resend.com) (free for 3,000 emails a month, 100 a day). Create an API key and add the secret `RESEND_API_KEY`.
2. **Verify a domain** (Domains → Add). Without one, Resend only delivers to your own email, so friends would never get their code. If the domain is on Cloudflare, Resend can add the DNS records for you.
3. Add the secret `EMAIL_FROM`, something like `Paw Pictures <hello@yourdomain.com>`.

## 6. The daily reminder

1. On any computer with Node: `npx web-push generate-vapid-keys`.
   - The public key goes in the build variable `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
   - The private key goes in the secret `VAPID_PRIVATE_KEY`. Never share it.
2. Add the secret `CRON_SECRET`: a long random string (a password generator is fine).

That's all. The hourly timer is already in `wrangler.jsonc` (a Cron Trigger), so there's no outside scheduler to set up. Its runs show under the Worker's **Settings → Trigger Events** and in **Logs**.

On iPhone, reminders only work after the site is added to the Home Screen. The app tells people how.

## 7. The rest

| Name | Kind | Value |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | build variable **and** secret | `https://paw-pictures.<you>.workers.dev` (or your domain) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | build variable | your support email |
| `STATS_KEY` | secret | a long random string; `/api/stats` with `Authorization: Bearer <it>` shows your funnel |

`NEXT_PUBLIC_SITE_URL` is needed in both places: the app uses it at build time, and the hourly timer reads it at run time.

**Payments can wait.** Leave `STRIPE_*` empty for the friends test: the plans show "Payments aren't switched on yet." Add Stripe test keys when you're ready; the webhook URL is `https://your-site/api/webhook`, and its events are listed in `.env.example`.

Deploy again (build variables only apply to a new build), then check `/api/health`.

**Then make one portrait and look at it.** The preview must have soft paw prints all over it. Cloudflare's local test tool can't draw them, so this is the first real check. No paws? Add the secret `WATERMARK_ENGINE` = `js` and switch to Workers Paid ($5/mo); the app then draws the paws itself.

## 8. Before anyone else sees it: the portrait test

On a computer:

```bash
npm install
npm run lab -- --sample                                     # 20 random dogs, if you don't have friends' photos yet
GEMINI_API_KEY=... npm run lab -- --yes --styles royal-court,family-album   # 40 images, about $1.50
GEMINI_API_KEY=... npm run lab -- --yes                     # all 6 eras: 120 images, about $4.40
```

Open `prompt-lab/out/index.html`. For every picture, ask one question: is that the same dog? If fewer than about 17 in 20 are, fix the prompts before the friends test.

## 9. The friends test (7 days)

- Send the link to 10 friends with pets, ideally some on iPhone and some on Android. Ask them to add it to their Home Screen and turn on the reminder.
- Don't explain the app. Watch where they get stuck.
- After 7 days, check `/api/stats`:

  | Question | Good looks like |
  |---|---|
  | Did they finish onboarding? | 8 of 10 |
  | Did they reach a 7-day roll? | 3 or more |
  | Did anyone invite someone you didn't? | at least 1 |
  | Did anyone share a Story? | at least 1 |

- Those friends can also be most of the 12 testers Google Play needs for 14 days.
