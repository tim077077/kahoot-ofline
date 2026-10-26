import { describe, expect, it, vi } from "vitest";
import { parseCrash, scrub, underCrashLimit } from "./crashLog";
import { MemoryStore } from "./store";

vi.mock("server-only", () => ({}));

describe("crash reports", () => {
  it("keeps what helps find the bug", () => {
    const crash = parseCrash(JSON.stringify({ where: "render", message: "Cannot read properties of undefined (reading 'id')", stack: "TypeError\n    at Pack (app.js:1:2)", page: "/", ua: "iPhone" }));
    expect(crash).toMatchObject({ where: "render", message: "Cannot read properties of undefined (reading 'id')", page: "/", ua: "iPhone" });
    expect(crash?.stack).toContain("at Pack");
  });

  it("blanks album keys and email addresses", () => {
    const token = "a".repeat(40);
    expect(scrub(`https://paw.pictures/#k=${token} failed`)).toBe("https://paw.pictures/#k=… failed");
    expect(scrub("sent to tim@example.com")).toBe("sent to …@…");
    expect(scrub(`token ${token}`)).toBe("token …");
  });

  it("cuts long reports and drops junk", () => {
    const crash = parseCrash(JSON.stringify({ message: "oops ".repeat(200), stack: Array.from({ length: 50 }, (_, i) => `at f${i}`).join("\n"), where: "<script>" }));
    expect(crash?.message.length).toBeLessThanOrEqual(300);
    expect(crash?.message.length).toBeGreaterThan(290);
    expect(crash?.stack.split("\n")).toHaveLength(12);
    expect(crash?.where).toBe("script");
    expect(parseCrash("not json")).toBeNull();
    expect(parseCrash(JSON.stringify({ message: "" }))).toBeNull();
    expect(parseCrash("null")).toBeNull();
  });

  it("stops one phone flooding the logs", async () => {
    const store = new MemoryStore();
    const now = new Date("2026-10-26T10:15:00Z");
    for (let i = 0; i < 20; i++) expect(await underCrashLimit(store, "1.2.3.4", now)).toBe(true);
    expect(await underCrashLimit(store, "1.2.3.4", now)).toBe(false);
    expect(await underCrashLimit(store, "5.6.7.8", now)).toBe(true);
    expect(await underCrashLimit(store, "1.2.3.4", new Date("2026-10-26T11:00:00Z"))).toBe(true);
  });
});
