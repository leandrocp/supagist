import { spawn } from "node:child_process";
import { localConfig } from "./local.mjs";

const config = localConfig();
const jwks = await (await fetch(`${config.API_URL}/auth/v1/.well-known/jwks.json`)).text();
const child = spawn("bash", ["supabase/functions/mcp/bench/runtime.sh", "serve"], {
  stdio: "inherit",
  env: {
    ...process.env,
    SUPABASE_URL: config.API_URL,
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: config.PUBLISHABLE_KEY }),
    SUPABASE_JWKS: jwks,
  },
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
