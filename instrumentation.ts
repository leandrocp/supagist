import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;

  // Vercel and other production hosts capture structured stderr. Keeping the
  // payload free of request headers avoids logging cookies or credentials.
  console.error(
    JSON.stringify({
      event: "server_request_error",
      message,
      digest,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "development",
      timestamp: new Date().toISOString(),
    }),
  );
};
