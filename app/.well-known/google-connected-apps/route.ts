import { googleConnectedAppsTokenResponse } from "@/lib/google-connected-apps";

// Google Connected Apps domain verification. The token is the committed
// google-connected-apps.json at the repository root; see lib/google-connected-apps.ts.
export function GET() {
  return googleConnectedAppsTokenResponse();
}
