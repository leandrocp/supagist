import { GET as mcp } from "@/app/mcp/[[...path]]/route";

// RFC 9728 well-known metadata for https://supagist.app/mcp. MCP clients that
// refresh without a fresh 401 challenge discover the authorization server here;
// when this 404s they fall back to supagist.app as the issuer and POST /token.
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  if (path.length > 1 || (path.length === 1 && path[0] !== "mcp")) {
    return new Response(null, { status: 404 });
  }
  return mcp(request, { params: Promise.resolve({ path: ["oauth-protected-resource"] }) });
}

export { handle as GET, handle as OPTIONS };
