/**
 * Interface for encryption/decryption providers.
 * Implement this interface to provide custom encryption logic.
 */
export interface EncryptionProvider {
  /**
   * Encrypts the given data.
   * @param data The data to encrypt
   * @returns The encrypted data as a string
   */
  encrypt(data: string): Promise<string> | string;

  /**
   * Decrypts the given encrypted data.
   * @param encrypted The encrypted data to decrypt
   * @returns The decrypted data as a string
   */
  decrypt(encrypted: string): Promise<string> | string;
}

/**
 * Default encryption provider using Web Crypto API with AES-GCM.
 * Uses a password-based key derivation (PBKDF2) to generate encryption keys.
 */
export class DefaultEncryptionProvider implements EncryptionProvider {
  private key: Promise<CryptoKey>;

  /**
   * Creates a new default encryption provider.
   * @param password The password to use for encryption/decryption
   * @param salt Optional salt for key derivation (should be consistent for the same dataset)
   */
  constructor(password: string, salt?: string) {
    this.key = this.deriveKey(password, salt ?? "grammy-storage");
  }

  private async deriveKey(
    password: string,
    salt: string,
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  async encrypt(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.key;

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(data),
    );

    // Combine IV and encrypted data, then encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encrypted: string): Promise<string> {
    const decoder = new TextDecoder();
    const key = await this.key;

    // Decode base64
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    return decoder.decode(decrypted);
  }
}
