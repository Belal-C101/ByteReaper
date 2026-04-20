/**
 * Messenger profile password hashing using Web Crypto PBKDF2-SHA256.
 * This is for the messenger-scoped identity layer, separate from E2E encryption keys.
 */

const enc = new TextEncoder();

export async function hashPassword(
  password: string,
  saltB64?: string
): Promise<{ hash: string; salt: string }> {
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 150_000 },
    keyMaterial,
    256
  );

  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  const saltOut = btoa(String.fromCharCode(...salt));
  return { hash: hashB64, salt: saltOut };
}

export async function verifyPassword(
  password: string,
  saltB64: string,
  hashB64: string
): Promise<boolean> {
  const { hash } = await hashPassword(password, saltB64);
  return hash === hashB64;
}
