import { afterEach, describe, expect, it, vi } from "vitest";
import { serverT } from "@/i18n/server";
import { backedUpEmail, codeEmail } from "./emails";

afterEach(() => vi.unstubAllEnvs());

describe("branded emails", async () => {
  const en = await serverT("en");
  it("puts the code first in the subject and preheader, in both versions", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pawpictures.app/");
    const e = codeEmail("482913", "signin", en);
    expect(e.subject).toMatch(/^482913 /);
    expect(e.html).toContain("482913 is your code");
    expect(e.text).toContain("482913");
    expect(e.html).toContain("Welcome back");
  });

  it("loads images from the public site, never a relative or signed link", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pawpictures.app/");
    const srcs = [...codeEmail("1", "backup", en).html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
    expect(srcs.length).toBeGreaterThan(3);
    for (const src of srcs) expect(src).toMatch(/^https:\/\/pawpictures\.app\/(styles\/[a-z-]+\.jpg|icon-192\.png)$/);
  });

  it("escapes the pet's name", () => {
    const e = backedUpEmail('<img src=x onerror=alert(1)>', en);
    expect(e.html).not.toContain("<img src=x");
    expect(e.html).toContain("&lt;img src=x");
    expect(backedUpEmail("Luna", en).subject).toBe("Luna's album is backed up");
    expect(backedUpEmail("  ", en).subject).toBe("Your album is backed up");
  });

  it("writes in the owner's language, and falls back to English", async () => {
    const de = codeEmail("482913", "backup", await serverT("de"));
    expect(de.html).toContain('<html lang="de">');
    expect(de.subject).toMatch(/^482913 /);
    expect(codeEmail("1", "backup", await serverT("xx")).html).toContain('<html lang="en">');
  });
});
