"use client";

import sodium from "libsodium-wrappers";

let _ready = false;

async function ensureReady() {
  if (!_ready) {
    await sodium.ready;
    _ready = true;
  }
}

// ─── Identity (X25519 keypair) ─────────────────────────────

export interface Identity {
  publicKey: Uint8Array; // 32 bytes X25519
  privateKey: Uint8Array; // 32 bytes X25519
}

/**
 * Generate a new X25519 keypair for E2E encryption.
 */
export async function generateIdentity(): Promise<Identity> {
  await ensureReady();
  const kp = sodium.crypto_box_keypair();
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

/**
 * Encrypt the private key with a password-derived key (Argon2id).
 * Returns the encrypted private key and the salt used for derivation.
 */
export async function encryptPrivateKey(
  privateKey: Uint8Array,
  password: string
): Promise<{ encryptedKey: string; salt: string }> {
  await ensureReady();
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const derivedKey = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = sodium.crypto_secretbox_easy(privateKey, nonce, derivedKey);

  // Concatenate nonce + encrypted for storage
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return {
    encryptedKey: sodium.to_base64(combined),
    salt: sodium.to_base64(salt),
  };
}

/**
 * Decrypt the private key using the user's password.
 */
export async function decryptPrivateKey(
  encryptedKeyBase64: string,
  saltBase64: string,
  password: string
): Promise<Uint8Array> {
  await ensureReady();
  const combined = sodium.from_base64(encryptedKeyBase64);
  const salt = sodium.from_base64(saltBase64);

  const derivedKey = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = combined.slice(sodium.crypto_secretbox_NONCEBYTES);

  return sodium.crypto_secretbox_open_easy(ciphertext, nonce, derivedKey);
}

// ─── Key Wrapping (X25519 sealed box) ──────────────────────

/**
 * Wrap (encrypt) a symmetric key for a specific peer's public key using sealed box.
 */
export async function wrapKeyForPeer(
  symmetricKey: Uint8Array,
  peerPublicKey: Uint8Array
): Promise<string> {
  await ensureReady();
  const sealed = sodium.crypto_box_seal(symmetricKey, peerPublicKey);
  return sodium.to_base64(sealed);
}

/**
 * Unwrap (decrypt) a symmetric key using my keypair.
 */
export async function unwrapKey(
  wrappedBase64: string,
  myPublicKey: Uint8Array,
  myPrivateKey: Uint8Array
): Promise<Uint8Array> {
  await ensureReady();
  const sealed = sodium.from_base64(wrappedBase64);
  return sodium.crypto_box_seal_open(sealed, myPublicKey, myPrivateKey);
}

// ─── Message Encryption (AES-GCM via libsodium secretbox) ──

/**
 * Generate a random 32-byte conversation key.
 */
export async function generateConversationKey(): Promise<Uint8Array> {
  await ensureReady();
  return sodium.crypto_secretbox_keygen();
}

/**
 * Encrypt a message with the conversation key.
 * Uses crypto_secretbox (XSalsa20-Poly1305) which is simpler and safer than raw AES-GCM.
 */
export async function encryptMessage(
  plaintext: string,
  conversationKey: Uint8Array
): Promise<{ ciphertext: string; iv: string }> {
  await ensureReady();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const msgBytes = sodium.from_string(plaintext);
  const encrypted = sodium.crypto_secretbox_easy(msgBytes, nonce, conversationKey);
  return {
    ciphertext: sodium.to_base64(encrypted),
    iv: sodium.to_base64(nonce),
  };
}

/**
 * Decrypt a message with the conversation key.
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  conversationKey: Uint8Array
): Promise<string> {
  await ensureReady();
  const ciphertext = sodium.from_base64(ciphertextBase64);
  const nonce = sodium.from_base64(ivBase64);
  const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, conversationKey);
  return sodium.to_string(decrypted);
}

// ─── Helpers ───────────────────────────────────────────────

export function toBase64(data: Uint8Array): string {
  return sodium.to_base64(data);
}

export function fromBase64(data: string): Uint8Array {
  return sodium.from_base64(data);
}
