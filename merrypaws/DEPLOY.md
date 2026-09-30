# Put it online (about 2 hours, $0 to start)

Everything here is free for a test with friends, except portraits (fal credits) and a domain for email.

When you're done, open `https://your-site/api/health` on your phone. Every line should say `true`.

## 1. The site: Vercel

1. Sign in to [vercel.com](https://vercel.com) with GitHub and click **Add New → Project**.
2. Pick the repo. If it's still `kahoot-ofline`, set **Root Directory** to `merrypaws`.
3. Don't deploy yet. First add the variables from the steps below under **Settings → Environment Variables**, then deploy.

Hobby (free) is fine for a friends test. It doesn't allow commercial use, so move to Pro ($20/mo) before you charge anyone.

## 2. The database: Upstash Redis

In the Vercel project: **Storage → Marketplace → Upstash → Redis**, free plan, connect it to the project. It adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` itself.

## 3. Photo storage: Cloudflare R2

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** → create a bucket called `paw-pictures`. The first 10 GB are free.
2. **R2 → Manage API tokens → Create token**, with **Object Read & Write** on that bucket.
3. Add these variables:

   | Variable | Value |
   |---|---|
   | `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
   | `S3_BUCKET` | `paw-pictures` |
   | `S3_ACCESS_KEY_ID` | from the token |
   | `S3_SECRET_ACCESS_KEY` | from the token |
   | `S3_REGION` | `auto` |

4. Bucket → **Settings → CORS policy**, so share cards can draw the photos:

   ```json
   [{ "AllowedOrigins": ["https://your-site.vercel.app"], "AllowedMethods": ["GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
   ```

## 4. Portraits: fal

[fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) → create a key → `FAL_KEY`. Add about $10 of credit: that's roughly 250 portraits.

## 5. Backup emails: Resend

1. Sign up at [resend.com](https://resend.com) (free for 3,000 emails a month, 100 a day). Create an API key and add it as `RESEND_API_KEY`.
2. **Verify a domain** (Domains → Add). Without one, Resend only delivers to your own email, so friends would never get their code. A domain costs about $10 a year.
3. Set `EMAIL_FROM` to something like `Paw Pictures <hello@yourdomain.com>`.

## 6. The daily reminder: web push and an hourly timer

1. On any computer with Node: `npx web-push generate-vapid-keys`. Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private one in `VAPID_PRIVATE_KEY`. Never share the private one.
2. Set `CRON_SECRET` to a long random string (a password generator is fine).
3. Vercel Hobby only runs timers once a day, so use [cron-job.org](https://cron-job.org) (free):
   - URL: `https://your-site/api/push/cron`
   - Schedule: every hour, at minute 0
   - Advanced → Headers: `Authorization` = `Bearer <your CRON_SECRET>`

   On Vercel Pro you can use a Vercel cron instead.

On iPhone, reminders only work after the site is added to the Home Screen. The app tells people how.

## 7. The rest

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://your-site.vercel.app` (or your domain) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | your support email |
| `STATS_KEY` | a long random string; `/api/stats` with `Authorization: Bearer <it>` shows your funnel |

**Payments can wait.** Leave `STRIPE_*` empty for the friends test: the plans show "Payments aren't switched on yet." Add Stripe test keys when you're ready (webhook events are listed in `.env.example`).

Deploy, then check `/api/health`.

## 8. Before anyone else sees it: the portrait test

On a computer:

```bash
npm install
npm run lab -- --sample                              # 20 random dogs, if you don't have friends' photos yet
FAL_KEY=... npm run lab -- --yes --styles royal-court,family-album   # 40 images, about $1.60
FAL_KEY=... npm run lab -- --yes                     # all 6 eras: 120 images, about $4.80
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
