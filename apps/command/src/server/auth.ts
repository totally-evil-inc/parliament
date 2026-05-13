import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

const VITE_BETTER_AUTH_URL = process.env.VITE_BETTER_AUTH_URL!;
// e.g. http://localhost:4000

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const incomingHeaders = getRequestHeaders();

  const res = await fetch(`${VITE_BETTER_AUTH_URL}/api/auth/get-session`, {
    method: "GET",
    headers: {
      cookie: incomingHeaders.get("cookie") ?? "",
      "user-agent": incomingHeaders.get("user-agent") ?? "",
      "x-forwarded-for": incomingHeaders.get("x-forwarded-for") ?? "",
    },
  });

  if (!res.ok) {
    return null;
  }

  return await res.json();
});

export const ensureSession = createServerFn({ method: "GET" }).handler(async () => {
  const incomingHeaders = getRequestHeaders();

  const res = await fetch(`${VITE_BETTER_AUTH_URL}/api/auth/get-session`, {
    method: "GET",
    headers: {
      cookie: incomingHeaders.get("cookie") ?? "",
      "user-agent": incomingHeaders.get("user-agent") ?? "",
      "x-forwarded-for": incomingHeaders.get("x-forwarded-for") ?? "",
    },
  });

  if (!res.ok) {
    throw new Error("Unauthorized");
  }

  const session = await res.json();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
});