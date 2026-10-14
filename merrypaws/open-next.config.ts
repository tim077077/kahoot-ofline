import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page is rendered per request (the album is personal), so there's no
// incremental cache to configure.
export default defineCloudflareConfig({});
