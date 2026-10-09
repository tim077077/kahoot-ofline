import { storeOr503 } from "@/lib/http";
import { authorizeUrl, officialConfig } from "@/lib/tiktok-official";

// Starts "Connect TikTok". Opened from the dashboard on this computer.
export async function GET() {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const { hasKeys, publicUrl } = officialConfig();
  if (!hasKeys || !publicUrl) return Response.redirect(new URL("/?tiktok=not_configured", localUrl()), 302);
  return Response.redirect(await authorizeUrl(store), 302);
}

function localUrl() {
  return process.env.SLIDEDROP_LOCAL_URL || "http://localhost:3000";
}
