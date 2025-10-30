import type { StorageAdapter } from "grammy";
import {
  DefaultEncryptionProvider,
  type EncryptionProvider,
} from "./encryption.ts";

/**
 * Options for configuring the encrypted storage adapter with a custom encryption provider.
 */
export interface EncryptedStorageWithProviderOptions<T> {
  /**
   * The underlying storage adapter to use for persistence.
   * Data will be encrypted before being written to this storage.
   */
  storage: StorageAdapter<string>;

  /**
   * Custom encryption provider.
   */
  encryptionProvider: EncryptionProvider;
}

/**
 * Options for configuring the encrypted storage adapter with password-based encryption.
 */
export interface EncryptedStorageWithPasswordOptions<T> {
  /**
   * The underlying storage adapter to use for persistence.
   * Data will be encrypted before being written to this storage.
   */
  storage: StorageAdapter<string>;

  /**
   * Password for the default encryption provider.
   */
  password: string;

  /**
   * Optional salt for the default encryption provider.
   */
  salt?: string;

  /**
   * Number of PBKDF2 iterations for key derivation.
   * Must be at least 600000. Defaults to 600000.
   * Higher values provide better security but slower performance.
   * Recommended: 600000 or higher based on latest OWASP recommendations.
   */
  iterations?: number;
}

/**
 * Options for configuring the encrypted storage adapter.
 * Either provide an encryptionProvider OR a password (with optional salt and iterations).
 */
export type EncryptedStorageOptions<T> =
  | EncryptedStorageWithProviderOptions<T>
  | EncryptedStorageWithPasswordOptions<T>;

/**
 * An enhanced storage adapter that encrypts data before writing and decrypts after reading.
 * Wraps any existing StorageAdapter to add encryption capabilities.
 *
 * @example
 * ```ts
 * import { MemorySessionStorage } from "grammy";
 * import { EncryptedStorageAdapter } from "./mod.ts";
 *
 * // Using default encryption
 * const encryptedStorage = new EncryptedStorageAdapter({
 *   storage: new MemorySessionStorage<string>(),
 *   password: "my-secret-password",
 * });
 *
 * // Using custom encryption
 * class MyEncryption implements EncryptionProvider {
 *   encrypt(data: string): string {
 *     return myCustomEncrypt(data);
 *   }
 *   decrypt(encrypted: string): string {
 *     return myCustomDecrypt(encrypted);
 *   }
 * }
 *
 * const customEncryptedStorage = new EncryptedStorageAdapter({
 *   storage: new MemorySessionStorage<string>(),
 *   encryptionProvider: new MyEncryption(),
 * });
 * ```
 */
export class EncryptedStorageAdapter<T> implements StorageAdapter<T> {
  private storage: StorageAdapter<string>;
  private encryptionProvider: EncryptionProvider;

  constructor(options: EncryptedStorageOptions<T>) {
    this.storage = options.storage;

    if ("encryptionProvider" in options) {
      this.encryptionProvider = options.encryptionProvider;
    } else {
      this.encryptionProvider = new DefaultEncryptionProvider({
        password: options.password,
        salt: options.salt,
        iterations: options.iterations,
      });
    }
  }

  async read(key: string): Promise<T | undefined> {
    const encrypted = await this.storage.read(key);
    if (encrypted === undefined) {
      return undefined;
    }

    try {
      const decrypted = await this.encryptionProvider.decrypt(encrypted);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      throw new Error(
        `Failed to decrypt data for key "${key}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async write(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const encrypted = await this.encryptionProvider.encrypt(serialized);
      await this.storage.write(key, encrypted);
    } catch (error) {
      throw new Error(
        `Failed to encrypt data for key "${key}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async delete(key: string): Promise<void> {
    await this.storage.delete(key);
  }
}
