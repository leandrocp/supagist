/**
 * App-side view of the CLI login handshake.
 *
 * The contract is defined once in the CLI package (`cli/src/protocol.ts`) and
 * re-exported here so `/auth/cli` and the CLI can never drift on port/state
 * validation or the callback shape. It is deliberately dependency-free so both
 * runtimes can compile it.
 */
export {
  CLI_CALLBACK_PATH,
  CLI_MIN_PORT,
  CLI_MAX_PORT,
  CLI_STATE_BYTES,
  parseCliPort,
  parseCliState,
  cliCallbackUrl,
  cliAuthorizePath,
  parseCliSessionPayload,
  type CliSessionPayload,
} from "@/cli/src/protocol";
