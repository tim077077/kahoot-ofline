# The psychology of Paw Pictures

The goal: people understand the app in seconds, come back every day because they want to, and bring their friends. This is habit-forming by design, and it is honest by design: Apple rejects manipulative apps, and users punish them in reviews.

Researched September 2026. Sources are at the end.

## The models we build on

- **Fogg behavior model: B = M × A × P.** A behavior happens when motivation, ability and a prompt meet at the same moment. We can't manufacture love for a pet (motivation is already huge). So we make the action tiny (ability) and put a prompt in front of it every day.
- **The Hook model:** trigger, then action, then a variable reward, then investment. Each loop leaves something behind (a photo, a caption, a streak) that makes the next loop more likely.
- **Loss aversion.** Losing something hurts more than gaining it pleases. That's why a 7-day streak feels like "7 days I could lose". It's powerful, so it's handled with care (see guardrails).
- **Nostalgia and "On this day".** Timehop reached 12M users on resurfaced memories. Facebook's "On This Day" was visited by 90 million people in its test phase. Pets age fast, so a year-old photo of your dog is very strong.
- **Small, finite social.** BeReal and Locket grew on one photo a day from close friends, not an endless public feed.

## How each one shows up in the app

| Principle | Feature | Where |
|---|---|---|
| Value before the ask; endowed progress | The onboarding ends on "chapter one" made from *their* photos. Those photos already count as **Day 1** of the roll. | `Onboarding.tsx` |
| Tiny action (Fogg: ability) | **Photo of the day**: one button, any photo, about 2 taps. | `Daily.tsx`, `DailyCard` |
| Daily prompt (Fogg: prompt) | A small new idea every day ("Their sleepy face", "Paws, up close"). In the store app, one push notification a day at most. | `dailyPrompts.ts` |
| Variable reward | The prompt changes daily; "A year ago today" memories appear unpredictably; paws from friends; the print "develops". | `MemoryCard`, the Pack |
| Streak with loss aversion | The **photo-a-day roll**: a film strip, one frame per day. | `FilmRoll`, `daily.ts` |
| Streak freezes (Duolingo: -21% churn among users about to lose a streak) | Freezes cover a missed day automatically: 1 a month on Free, 2 to 4 on plans. | `grantFreezes` |
| Milestones (peak-end rule) | At days 3, 7, 14, 30, 50, 100, 200 and 365, a celebration with the roll so far and a one-tap Instagram Story. | `MilestoneSheet` |
| Investment | Captions "on the back", highlight tags, favourites. The album is worth more every week and is theirs to keep. | `PhotoViewer` |
| Social reward and reciprocity | **The Pack**: friends see each other's photo of the day and leave a paw, a heart or a laugh. | `Pack.tsx`, `pack.ts` |
| Social proof | "2 of 5 shared a photo today". | `PackTab` |
| Viral loop | Invite link (`?pack=CODE`) and friend codes. Every Instagram Story carries "made with Paw Pictures". | `invite()`, `share.ts` |
| Pride, then sharing | An Instagram Story button on every photo, collage, portrait and milestone, at the moment people feel proudest. | `shareToInstagramStory` |
| Anchoring and the compromise effect | Three plans, the priciest first (the anchor); **Plus** in the middle, highlighted as "Most loved", shown as "about 8¢ a day". | `PlanCards` |
| Decoy (asymmetric dominance) | Starter at $19.99/yr gives 5 portraits a month; Plus at $29.99 gives 30. Six times the portraits for $10 more makes Plus the obvious pick. | `config.ts` |

**A note on the decoy effect:** its classic studies didn't replicate well with realistic products. Anchoring and putting the target in the middle are the more reliable parts. We use all three, but we judge the pricing page on real conversion, not theory.

## Guardrails (what we deliberately don't do)

These are also Apple review risks. Apple rejects apps that "manipulate users through dark patterns, overwhelm them with aggressive notifications, or create addictive behaviours without genuine value."

- **Never hold the streak hostage.** When a free album is full, the roll **pauses** instead of breaking. Nobody loses a 60-day streak because they didn't pay.
- **No streaks for memorial albums.** "In loving memory" turns off the roll, the daily prompt and the milestones, and softens the words everywhere. A streak for a pet who has died would be cruel.
- **No guilt copy.** No "Luna misses you", no crying mascot, and no notifications about a streak about to die. The missed-day story is "a freeze covered it".
- **No endless feed.** The Pack shows today only. You're done in a minute.
- **One notification a day, maximum** (store app), and only when there's something new: the prompt, a memory, or a friend's paw.
- **No fake scarcity.** No countdowns, no fake discounts, no "10,000 people made one today". Prices are the full price.
- **Cancelling is as easy as subscribing.** "Manage or cancel your plan" sits in Membership (Stripe's billing page on the web, the store's settings in the apps). The FTC's click-to-cancel rule was vacated in 2025, but the FTC still enforces ROSCA case by case, and it's simply right.
- **Albums are private.** Only the photo of the day is shared with the pack, and "Friends can see it" is one tap to turn off.

## What to measure

The funnel counters (`/api/stats`) cover each of these:

| Question | Events | Good looks like |
|---|---|---|
| Do people get it? | `onboarding_name` → `onboarding_photos` → `onboarding_page` → `onboarding_done` | above 60% reach the page |
| Do they come back? | `daily_done` per day ÷ daily visitors | above 30% |
| Does the streak hold? | `streak_milestone` (7 and 30) | above 20% of new users hit day 7 |
| Is it spreading? | `pack_invite_sent`, `pack_joined` | above 0.3 joins per new user |
| Is it free marketing? | `story_share` | above 10% of weekly users |
| Is the price right? | `plans_shown` → `purchase` | 3 to 5% of free users within 30 days |

**If day-7 streaks are low, fix the prompt before anything else:** the time of day and the wording. That's the lever Duolingo pulled 600 times.

## Next steps (store app only)

1. **Push notifications:** the daily prompt at a time the member picks (default 6pm), memories, and paws from friends. One a day at most.
2. **A home-screen widget** with today's photo from the pack (the Locket move). This needs native code.
3. **Pack streaks:** days in a row that *both* of you posted. A shared streak is harder to drop.

## Sources

- [Duolingo streak system breakdown](https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f)
- [The psychology of Duolingo's streak](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature)
- [Duolingo's retention strategy](https://www.trypropel.ai/resources/blogs/duolingo-customer-retention-strategy)
- [Hook model](https://concepts.dsebastien.net/concept/hook-model/)
- [Fogg behavior model guide](https://www.koji.so/docs/fogg-behavior-model-guide)
- [Why big tech wants us nostalgic](https://www.newstatesman.com/science-tech/2021/01/why-does-big-tech-want-us-feel-nostalgic)
- [Google Photos "Rediscover This Day"](https://techcrunch.com/2015/08/20/google-photos-introduces-rediscover-this-day-to-help-you-reminisce/)
- [BeReal](https://en.wikipedia.org/wiki/BeReal)
- [Decoy effect in tiered pricing](https://www.getmonetizely.com/articles/the-decoy-effect-how-strategic-pricing-tiers-can-maximize-revenue)
- [Decoy effect replication problems](https://atticusli.com/replication-crisis/decoy-effect-asymmetric-dominance/)
- [Tiered app pricing](https://adapty.io/blog/tiered-pricing/)
- [Dark patterns and App Store rejections](https://adapty.io/blog/dark-patterns-and-tricks-in-mobile-apps)
- [Subscription guidelines](https://conductatlas.com/platform/apple/apple-app-store-review-guidelines/subscription-and-auto-renewal-requirements/)
- [FTC click-to-cancel status](https://www.bclplaw.com/en-US/events-insights-news/im-not-dead-yet-is-the-demise-of-the-ftcs-click-to-cancel-exaggerated.html)
