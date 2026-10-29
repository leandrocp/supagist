#!/usr/bin/env bash
set -euo pipefail

here="$(dirname "$(realpath "$0")")"
functions="$(realpath "$here/../..")"
container="${BENCH_CONTAINER:-supagist-mcp-bench}"
cli_container="${SUPABASE_EDGE_CONTAINER:-supabase_edge_runtime_zivpihasridowvzrgiix}"
command="${1:-help}"

case "$command" in
  serve|bundle)
    # Use the immutable image ID of the actual local CLI runtime, not a mutable tag.
    image="$(docker inspect --format '{{.Image}}' "$cli_container")"
    printf 'Using CLI Edge Runtime image %s\n' "$image" >&2
    ;;
esac

case "$command" in
  serve)
    : "${SUPABASE_URL:?Set the host-reachable LOCAL Supabase URL}"
    : "${SUPABASE_PUBLISHABLE_KEYS:?Set JSON containing the local publishable key}"
    : "${SUPABASE_JWKS:?Set the public local JWKS JSON}"
    # Parse the URL rather than accepting a hostname-looking prefix with userinfo.
    node --input-type=module -e '
      const url = new URL(process.env.SUPABASE_URL);
      if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)
          || url.username || url.password || !url.port || url.pathname !== "/"
          || url.search || url.hash) {
        throw new Error("Only loopback HTTP Supabase origins are accepted");
      }
    '
    policy="${BENCH_POLICY:-per_worker}"
    case "$policy" in
      per_worker|oneshot) ;;
      *) echo 'BENCH_POLICY must be per_worker or oneshot' >&2; exit 1 ;;
    esac
    export BENCH_POLICY="$policy"
    export BENCH_CPU_LIMIT_MS="${BENCH_CPU_LIMIT_MS:-2000}"
    export BENCH_MEMORY_LIMIT_MB="${BENCH_MEMORY_LIMIT_MB:-256}"
    # Foreground: launch through `amp orb service start`, never docker -d/nohup/&.
    exec docker run --rm --name "$container" --network host \
      --mount "type=bind,src=$functions,dst=/functions,readonly" \
      --env SUPABASE_URL --env SUPABASE_PUBLISHABLE_KEYS --env SUPABASE_JWKS \
      --env BENCH_POLICY --env BENCH_CPU_LIMIT_MS --env BENCH_MEMORY_LIMIT_MB --entrypoint edge-runtime "$image" start \
      --ip 127.0.0.1 --port "${BENCH_PORT:-9000}" \
      --main-service /functions/mcp/bench/main \
      --event-worker /functions/mcp/bench/events \
      --policy "$policy" --max-parallelism 1
    ;;
  bundle)
    output="$(realpath -m "${2:?Usage: runtime.sh bundle /absolute/output-directory}")"
    mkdir -p "$output"
    docker run --rm --entrypoint edge-runtime \
      --mount "type=bind,src=$functions,dst=/functions,readonly" \
      --mount "type=bind,src=$output,dst=/out" \
      "$image" bundle --entrypoint /functions/mcp/index.ts \
      --static '/functions/mcp/assets/**/*' --output /out/mcp.eszip
    # v1.74.3 stores static assets as opaque uncompressed bytes. Check actual
    # contents: Rust glob's trailing /** alone silently matches only directories.
    node --input-type=module - "$functions/mcp/assets" "$output/mcp.eszip" <<'NODE'
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const [root, archive] = process.argv.slice(2);
const bundle = readFileSync(archive);
let count = 0;
function verify(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) verify(path);
    else if (entry.isFile()) {
      if (!bundle.includes(readFileSync(path))) throw new Error(`Missing bundled asset: ${path}`);
      count++;
    }
  }
}
verify(root);
if (!count) throw new Error("No static assets found");
console.log(JSON.stringify({ kind: "bench.bundle-assets", verified: count }));
NODE
    printf '%s\n' "$image" > "$output/runtime-image.txt"
    wc -c "$output/mcp.eszip"
    sha256sum "$output/mcp.eszip"
    ;;
  peak)
    # cgroup v2 high-water mark across the WHOLE container lifetime, in bytes.
    # Fail rather than silently substituting current usage or a sampled maximum.
    peak="$(docker exec "$container" cat /sys/fs/cgroup/memory.peak)"
    [[ "$peak" =~ ^[0-9]+$ ]] || { echo 'Invalid/unavailable cgroup memory.peak' >&2; exit 1; }
    printf '{"kind":"bench.container-peak","scope":"container-lifetime","bytes":%s}\n' "$peak"
    ;;
  logs) docker logs "$container" 2>&1 ;;
  stop) docker stop --time 20 "$container" ;;
  *)
    echo 'Usage: bash runtime.sh serve | bundle OUTPUT_DIRECTORY | peak | logs | stop'
    [[ "$command" == help ]]
    ;;
esac
