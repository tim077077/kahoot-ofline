# Share straight to Instagram Stories

Every photo, collage, portrait and milestone has an **Instagram Story** button. It draws a 9:16 story card (a taped print on cream paper, the date stamp, the caption, the pet's name and "made with Paw Pictures"), then hands it to Instagram.

## Web (today)

Instagram doesn't let a web page open Stories with an image. So the button opens the phone's share sheet with the story card attached, and Instagram is one tap away.

On a desktop browser without a share sheet, the card downloads instead.

## Store app: straight into Stories (built)

Instagram's official "Sharing to Stories" works from native apps, and the apps use it:

- Android: `android/app/src/main/java/com/pawpictures/app/InstagramStoriesPlugin.java`, registered in `MainActivity`. It writes the card to the cache, shares it through the app's `FileProvider` with the `com.instagram.share.ADD_TO_STORY` intent, and declares Instagram under `<queries>` so Android 11+ can see it.
- iOS: `ios/App/App/InstagramStoriesPlugin.swift`, registered in `AppViewController` (the storyboard's view controller). It puts the card on the pasteboard and opens `instagram-stories://share`; `instagram-stories` is in `LSApplicationQueriesSchemes`.
- The web code calls it through `instagramStory()` in `src/lib/native.ts`.

It needs a **Meta (Facebook) App ID**; without one Instagram refuses with "The app you shared from doesn't currently support sharing to Stories", so the app doesn't try and opens the share sheet instead. The same fallback covers phones without Instagram.

1. Create a Meta app at developers.facebook.com (type: Business or Consumer; no review needed for Stories sharing) and copy its App ID.
2. Build the apps with `NEXT_PUBLIC_META_APP_ID` set to it, e.g. `NEXT_PUBLIC_META_APP_ID=123... NEXT_PUBLIC_API_BASE=https://your-site npm run app:apk`.

Background images must be JPG or PNG, at least 720x1280. The story card is 1080x1920.

Reference: https://developers.facebook.com/docs/instagram-platform/sharing-to-stories
