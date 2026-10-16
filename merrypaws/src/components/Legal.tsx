"use client";

import { useT } from "@/i18n/react";
import { legalUrl } from "@/lib/client";
import { isNative } from "@/lib/native";

// Terms and privacy policy links, under every price and in the consent sheet.
// In the apps a link to the site opens in the phone's browser.
export function LegalLinks({ className = "" }: { className?: string }) {
  const t = useT();
  const target = isNative() ? undefined : "_blank";
  return (
    <p className={`text-center text-xs text-muted ${className}`}>
      <a href={legalUrl("terms")} target={target} rel="noopener" className="underline underline-offset-4">
        {t("legal.terms")}
      </a>
      <span aria-hidden> · </span>
      <a href={legalUrl("privacy")} target={target} rel="noopener" className="underline underline-offset-4">
        {t("legal.privacy")}
      </a>
    </p>
  );
}
