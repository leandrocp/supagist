export function reportClientError(error: Error & { digest?: string }): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    message: error.message.slice(0, 500),
    digest: error.digest?.slice(0, 200),
    path: window.location.pathname.slice(0, 500),
  });

  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/errors", new Blob([payload], { type: "application/json" }));
    return;
  }

  void fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}
