import { storeOr503 } from "@/lib/http";
import { checkState, finishLogin, TikTokApiError } from "@/lib/tiktok-official";

// TikTok sends you back here (through your tunnel) after you allow access.
// Then it's back to the dashboard on this computer.
export async function GET(request: Request) {
  const local = process.env.SLIDEDROP_LOCAL_URL || "http://localhost:3000";
  const back = (result: string) => Response.redirect(new URL(`/?tiktok=${result}`, local), 302);
  const store = storeOr503();
  if (store instanceof Response) return store;

  const params = new URL(request.url).searchParams;
  if (!(await checkState(store, params.get("state")))) return back("bad_state");
  const code = params.get("code");
  if (!code) return back(params.get("error") === "access_denied" ? "denied" : "failed");
  try {
    await finishLogin(store, code);
    return back("connected");
  } catch (err) {
    console.error("tiktok login failed", err instanceof TikTokApiError ? err.code : err);
    return back("failed");
  }
}
