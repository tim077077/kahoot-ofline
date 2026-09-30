# Share straight to Instagram Stories

Every photo, collage, portrait and milestone has an **Instagram Story** button. It draws a 9:16 story card (a taped print on cream paper, the date stamp, the caption, the pet's name and "made with Paw Pictures"), then hands it to Instagram.

## Web (today)

Instagram doesn't let a web page open Stories with an image. So the button opens the phone's share sheet with the story card attached, and Instagram is one tap away.

On a desktop browser without a share sheet, the card downloads instead.

## Store app: straight into Stories

Instagram's official "Sharing to Stories" works from native apps. It needs a **Meta (Facebook) App ID**; without one, Instagram shows "The app you shared from doesn't currently support sharing to Stories".

The web code already calls a Capacitor plugin named `InstagramStories` when it exists:

```ts
Capacitor.Plugins.InstagramStories.share({ backgroundImage: "data:image/jpeg;base64,...", appId: NEXT_PUBLIC_META_APP_ID })
```

Write that tiny plugin once, for each platform.

1. Create a Meta app at developers.facebook.com and copy its App ID into `NEXT_PUBLIC_META_APP_ID`.
2. **iOS.**
   - Add `instagram-stories` to `LSApplicationQueriesSchemes` in Info.plist.
   - In the plugin:

   ```swift
   let data = Data(base64Encoded: backgroundImage.components(separatedBy: ",").last ?? "")!
   let url = URL(string: "instagram-stories://share?source_application=\(appId)")!
   guard UIApplication.shared.canOpenURL(url) else { call.reject("Instagram not installed"); return }
   UIPasteboard.general.setItems([["com.instagram.sharedSticker.backgroundImage": data]],
                                 options: [.expirationDate: Date().addingTimeInterval(300)])
   UIApplication.shared.open(url)
   call.resolve()
   ```

3. **Android.**
   - Write the image to the cache directory and expose it through a `FileProvider`.
   - Then:

   ```kotlin
   val intent = Intent("com.instagram.share.ADD_TO_STORY").apply {
       putExtra("source_application", appId)
       setDataAndType(uri, "image/jpeg")
       addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
   }
   if (activity.packageManager.resolveActivity(intent, 0) != null) activity.startActivity(intent)
   else call.reject("Instagram not installed")
   ```

Background images must be JPG or PNG, at least 720x1280. The story card is 1080x1920.

Reference: https://developers.facebook.com/docs/instagram-platform/sharing-to-stories
