/**
 * grammY Encrypted Storage - Enhanced StorageAdapter with Encryption
 *
 * This plugin provides an encrypted storage adapter that wraps any existing
 * StorageAdapter to add encryption/decryption capabilities. It also includes
 * a text vault plugin demonstrating usage of encrypted storage.
 *
 * @module
 */

export { EncryptedStorageAdapter } from "./encrypted-adapter.ts";
export type { EncryptedStorageOptions } from "./encrypted-adapter.ts";

export {
  DefaultEncryptionProvider,
  type EncryptionProvider,
} from "./encryption.ts";

export { vault } from "./plugin.ts";
export type {
  VaultData,
  VaultEntry,
  VaultFlavor,
  VaultOptions,
} from "./plugin.ts";
export type { StorageAdapter } from "grammy";
