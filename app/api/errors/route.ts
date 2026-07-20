import { NextResponse, type NextRequest } from "next/server";

const MAX_BODY_BYTES = 4096;

type ClientErrorReport = {
  message?: unknown;
  digest?: unknown;
  path?: unknown;
};

function boundedString(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, maxLength) : undefined;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ accepted: false }, { status: 413 });
  }

  let report: ClientErrorReport;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ accepted: false }, { status: 413 });
    }
    report = JSON.parse(new TextDecoder().decode(bytes)) as ClientErrorReport;
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  const message = boundedString(report.message, 500);
  if (!message) {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  console.error(
    JSON.stringify({
      event: "client_route_error",
      message,
      digest: boundedString(report.digest, 200),
      path: boundedString(report.path, 500),
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "development",
      timestamp: new Date().toISOString(),
    }),
  );

  return NextResponse.json(
    { accepted: true },
    { status: 202, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
