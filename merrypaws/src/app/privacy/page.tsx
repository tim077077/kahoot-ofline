import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/LegalPage";
import { BRAND, LIMITS } from "@/lib/config";

export const metadata: Metadata = { title: `Privacy policy · ${BRAND}` };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        {BRAND} is a photo album for your pet that can also turn photos into vintage portraits. This page says what we collect, why, who
        helps us run the service, and what you can do about it. Short version: your album is private, we don&apos;t sell or share your
        data for advertising, and there are no ads or tracking tools in the app.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Photos you add</strong> to your album, with the date they were taken, and the captions and tags you give them.</li>
        <li><strong>Photos you use for a portrait</strong>: your pet&apos;s photo and, if you choose, a photo of yourself.</li>
        <li><strong>Your pet&apos;s details</strong>: name, kind of animal, and the settings you pick.</li>
        <li><strong>Your email address</strong>, only if you back up your album or sign in with a code.</li>
        <li><strong>A random device id</strong> created by the app, so one phone gets one free portrait.</li>
        <li><strong>Your IP address</strong>, scrambled (hashed) and kept for up to two days, to stop abuse of the free portraits.</li>
        <li><strong>Purchases</strong>: which plan or pack you bought and when it renews. Card details never reach us; the App Store, Google Play or our payment provider handles them.</li>
        <li><strong>Reminder settings</strong>: the hour you picked and, on the web, your browser&apos;s push address.</li>
        <li><strong>Usage counts</strong>: daily totals such as &quot;portraits made today&quot;, not tied to you.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To show you your album and make the portraits you ask for.</li>
        <li>To send the sign-in codes and the daily reminder you turned on.</li>
        <li>To give you what you paid for, and to prevent abuse.</li>
        <li>To see, in totals, which parts of the app people use, so we can improve it.</li>
      </ul>
      <p>We rely on your agreement (for portraits and reminders), on providing the service you asked for, and on our legitimate interest in keeping it safe from abuse.</p>

      <h2>AI portraits</h2>
      <p>
        When you make a portrait, the photos you pick for it are sent to Google&apos;s Gemini API, which paints the image. We ask for your
        agreement in the app before the first one. Google processes these photos only to return the portrait, under its paid API terms,
        and doesn&apos;t use them to train its models. Neither do we. Only add photos of people who are happy to be in them.
      </p>

      <h2>Who helps us run {BRAND}</h2>
      <ul>
        <li><strong>Cloudflare</strong>: hosting and photo storage.</li>
        <li><strong>Upstash</strong>: the database that holds your album&apos;s details.</li>
        <li><strong>Google (Gemini API)</strong>: painting portraits.</li>
        <li><strong>Resend</strong>: sending sign-in codes and backup emails.</li>
        <li><strong>RevenueCat</strong>, with <strong>Apple</strong>, <strong>Google Play</strong> or <strong>Stripe</strong>: purchases and subscriptions.</li>
      </ul>
      <p>They handle data only on our behalf. Some are based outside the EU; where that happens, transfers are covered by the EU&apos;s standard contractual clauses or an equivalent safeguard.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your album and its photos: until you delete them or your whole album.</li>
        <li>Portraits: {LIMITS.portraitTtlDays} days, unless you save them to your phone.</li>
        <li>Sign-in codes: 15 minutes.</li>
        <li>Purchase records: as long as the law requires for accounting.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>Delete everything</strong> from the app: You → Privacy → Delete my data. Your photos, portraits, album and email are removed from our servers. This doesn&apos;t cancel a subscription; cancel it in your App Store or Google Play settings first.</li>
        <li>Turn the reminder off at any time in the app or your phone&apos;s settings.</li>
        <li>You can ask us for a copy of your data, to correct it, or to stop a particular use of it, by writing to <Contact />. If you&apos;re in the EU or UK you can also complain to your data protection authority.</li>
      </ul>

      <h2>Children</h2>
      <p>{BRAND} isn&apos;t meant for children under 13 (16 in some EU countries), and we don&apos;t knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, we&apos;ll say so in the app before it takes effect.</p>

      <h2>Contact</h2>
      <p>Questions about your data: <Contact />.</p>
    </LegalPage>
  );
}
