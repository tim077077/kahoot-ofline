import { afterEach, describe, expect, it, vi } from "vitest";
import { backedUpEmail, codeEmail } from "./emails";

afterEach(() => vi.unstubAllEnvs());

describe("branded emails", () => {
  it("puts the code first in the subject and preheader, in both versions", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pawpictures.app/");
    const e = codeEmail("482913", "signin");
    expect(e.subject).toMatch(/^482913 /);
    expect(e.html).toContain("482913 is your code");
    expect(e.text).toContain("482913");
    expect(e.html).toContain("Welcome back");
  });

  it("loads images from the public site, never a relative or signed link", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pawpictures.app/");
    const srcs = [...codeEmail("1", "backup").html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
    expect(srcs.length).toBeGreaterThan(3);
    for (const src of srcs) expect(src).toMatch(/^https:\/\/pawpictures\.app\/(styles\/[a-z-]+\.jpg|icon-192\.png)$/);
  });

  it("escapes the pet's name", () => {
    const e = backedUpEmail('<img src=x onerror=alert(1)>');
    expect(e.html).not.toContain("<img src=x");
    expect(e.html).toContain("&lt;img src=x");
    expect(backedUpEmail("Luna").subject).toBe("Luna's album is backed up");
    expect(backedUpEmail("  ").subject).toBe("Your album is backed up");
  });
});
