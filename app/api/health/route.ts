import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  if (!hasEnvVars) {
    return NextResponse.json(
      { status: "unhealthy", database: "unconfigured" },
      { status: 503, headers: noStoreHeaders },
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("snippets").select("id", { head: true }).limit(1);
    if (error) {
      return NextResponse.json(
        { status: "unhealthy", database: "unreachable" },
        { status: 503, headers: noStoreHeaders },
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        database: "ok",
        release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "development",
      },
      { headers: noStoreHeaders },
    );
  } catch {
    return NextResponse.json(
      { status: "unhealthy", database: "unreachable" },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
