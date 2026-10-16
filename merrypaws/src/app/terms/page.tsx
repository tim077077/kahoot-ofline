import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/LegalPage";
import { BRAND, LIMITS } from "@/lib/config";

export const metadata: Metadata = { title: `Terms · ${BRAND}` };

export default function Terms() {
  return (
    <LegalPage title="Terms of use">
      <p>
        These terms cover your use of {BRAND} on the web and in the apps. By using it you agree to them. If you got the app from the App
        Store, Apple&apos;s standard licence terms for apps also apply, and these terms take precedence where they differ.
      </p>

      <h2>Your album</h2>
      <p>
        You don&apos;t need a password. Your album lives on your phone and our servers, linked to your device; back it up with your email
        to bring it to a new phone. If you lose your phone without a backup, we may not be able to recover the album.
      </p>

      <h2>Your photos and portraits</h2>
      <ul>
        <li>Your photos stay yours. You let us store and process them only to run the service for you, including sending the ones you pick to our AI provider to make portraits.</li>
        <li>Only add photos you have the right to use, and photos of people only if they agree.</li>
        <li>Portraits you make are yours to keep, print and share for personal use.</li>
        <li>Portraits are made by AI and can look different from what you expect. A free preview lets you see one before you pay for the HD version.</li>
        <li>Portraits are kept for {LIMITS.portraitTtlDays} days; save the ones you want.</li>
      </ul>

      <h2>Don&apos;t</h2>
      <ul>
        <li>upload anything illegal, hateful, sexual, or that shows someone without their consent;</li>
        <li>try to get around the free limits, overload the service, or copy it with automated tools.</li>
      </ul>
      <p>We may remove content or close an album that breaks these rules. You can report a portrait from the app.</p>

      <h2>Plans and packs</h2>
      <ul>
        <li>Plans are subscriptions billed monthly or yearly at the price shown before you buy, in your currency, including any tax the store adds.</li>
        <li>They renew automatically until you cancel. Cancel at least 24 hours before the period ends to avoid the next charge. In the apps, cancel in your App Store or Google Play subscription settings; on the web, use &quot;Manage or cancel your plan&quot; in the app.</li>
        <li>After you cancel, your plan stays on until the end of the period you paid for. Your photos stay in the album afterwards, within the free plan&apos;s limits for adding new ones.</li>
        <li>Portrait packs are one-off purchases of HD portraits that don&apos;t expire while your album exists.</li>
        <li>Refunds for purchases in the apps are handled by Apple or Google under their rules. For web purchases, write to <Contact /> within 14 days. This doesn&apos;t limit any rights you have under consumer law.</li>
        <li>Prices and plans may change; a price change for an existing plan applies from the next renewal and you&apos;ll be told before.</li>
      </ul>

      <h2>The service</h2>
      <p>
        We work to keep {BRAND} running and your photos safe, but it&apos;s provided as it is, without a promise that it will never be
        interrupted. Keep copies of photos that matter to you. To the extent the law allows, we aren&apos;t liable for indirect losses,
        and our total liability is limited to what you paid us in the last 12 months. Nothing here limits liability that can&apos;t be
        limited by law.
      </p>

      <h2>Ending</h2>
      <p>You can stop using {BRAND} and delete your album at any time from the app. We may end the service with reasonable notice, and will refund unused yearly plans if we do.</p>

      <h2>Changes</h2>
      <p>We may update these terms. If a change matters, we&apos;ll tell you in the app before it takes effect.</p>

      <h2>Contact</h2>
      <p><Contact /></p>
    </LegalPage>
  );
}
