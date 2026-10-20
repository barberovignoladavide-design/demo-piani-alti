import { env } from "cloudflare:workers";

const COOKIE_NAME = "pa_admin";
const SESSION_SECONDS = 12 * 60 * 60;

function secrets() {
  const password = env.ADMIN_PASSWORD;
  const signingKey = env.ADMIN_SESSION_SECRET;
  if (!password || !signingKey) {
    throw new Error("Admin authentication is not configured.");
  }
  return { password, signingKey };
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function signature(expires: string, signingKey: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expires))));
}

export async function passwordMatches(candidate: string) {
  const { password } = secrets();
  return equalBytes(await sha256(candidate), await sha256(password));
}

export async function adminCookie() {
  const { signingKey } = secrets();
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const signed = await signature(expires, signingKey);
  return `${COOKIE_NAME}=${expires}.${signed}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function expiredAdminCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function isAdmin(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map(part => part.trim())
    .find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!cookie) return false;
  const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(cookie);
  if (!match || Number(match[1]) <= Math.floor(Date.now() / 1000)) return false;
  const { signingKey } = secrets();
  const expected = await signature(match[1], signingKey);
  return equalBytes(new TextEncoder().encode(match[2]), new TextEncoder().encode(expected));
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
