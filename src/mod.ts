/**
 * grammY Encrypted Storage - Enhanced StorageAdapter with Encryption
 *
 * This module provides an encrypted storage adapter that wraps any existing
 * StorageAdapter to add encryption/decryption capabilities.
 *
 * @module
 */

export { EncryptedStorageAdapter } from "./encrypted-adapter.ts";
export type { EncryptedStorageOptions } from "./encrypted-adapter.ts";

export {
  DefaultEncryptionProvider,
  type EncryptionProvider,
} from "./encryption.ts";

export type { StorageAdapter } from "grammy";
