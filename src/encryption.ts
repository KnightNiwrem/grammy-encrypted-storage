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
 * Options for configuring the DefaultEncryptionProvider.
 */
export interface DefaultEncryptionOptions {
  /**
   * Password for encryption/decryption.
   */
  password: string;

  /**
   * Optional salt for key derivation (should be consistent for the same dataset).
   */
  salt?: string;

  /**
   * Number of PBKDF2 iterations for key derivation.
   * Must be at least 310000. Defaults to 310000.
   * Higher values provide better security but slower performance.
   * Recommended range: 310000-600000.
   */
  iterations?: number;
}

const MIN_ITERATIONS = 310000;
const DEFAULT_ITERATIONS = 310000;

/**
 * Safely converts a Uint8Array to a base64 string without blowing the stack.
 * Uses chunking to handle large payloads (>64KB) that would cause
 * String.fromCharCode(...array) to fail.
 */
function uint8ArrayToBase64(array: Uint8Array): string {
  const CHUNK_SIZE = 32768; // 32KB chunks to stay well under stack limits
  let binaryString = "";

  for (let i = 0; i < array.length; i += CHUNK_SIZE) {
    const chunk = array.subarray(i, Math.min(i + CHUNK_SIZE, array.length));
    binaryString += String.fromCharCode(...chunk);
  }

  return btoa(binaryString);
}

/**
 * Safely converts a base64 string to a Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Default encryption provider using Web Crypto API with AES-GCM.
 * Uses a password-based key derivation (PBKDF2) to generate encryption keys.
 */
export class DefaultEncryptionProvider implements EncryptionProvider {
  private key: Promise<CryptoKey>;

  /**
   * Creates a new default encryption provider.
   * @param options Configuration options or password string (for backward compatibility)
   * @param salt Optional salt (only used if first parameter is a string)
   */
  constructor(
    options: DefaultEncryptionOptions | string,
    salt?: string,
  ) {
    let password: string;
    let actualSalt: string;
    let iterations: number;

    if (typeof options === "string") {
      // Backward compatibility: constructor(password, salt?)
      password = options;
      actualSalt = salt ?? "grammy-storage";
      iterations = DEFAULT_ITERATIONS;
    } else {
      // New style: constructor(options)
      password = options.password;
      actualSalt = options.salt ?? "grammy-storage";
      iterations = options.iterations ?? DEFAULT_ITERATIONS;

      if (iterations < MIN_ITERATIONS) {
        throw new Error(
          `PBKDF2 iterations must be at least ${MIN_ITERATIONS} for security. Provided: ${iterations}`,
        );
      }
    }

    this.key = this.deriveKey(password, actualSalt, iterations);
  }

  private async deriveKey(
    password: string,
    salt: string,
    iterations: number,
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
        iterations,
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

    return uint8ArrayToBase64(combined);
  }

  async decrypt(encrypted: string): Promise<string> {
    const decoder = new TextDecoder();
    const key = await this.key;

    // Decode base64
    const combined = base64ToUint8Array(encrypted);

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
