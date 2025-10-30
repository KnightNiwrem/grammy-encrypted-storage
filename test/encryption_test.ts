import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { MemorySessionStorage } from "grammy";
import {
  DefaultEncryptionProvider,
  EncryptedStorageAdapter,
  type EncryptionProvider,
} from "../src/mod.ts";

describe("Encryption Provider", () => {
  describe("DefaultEncryptionProvider", () => {
    it("should encrypt and decrypt data correctly", async () => {
      const provider = new DefaultEncryptionProvider("test-password");
      const original = "Hello, World!";

      const encrypted = await provider.encrypt(original);
      const decrypted = await provider.decrypt(encrypted);

      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
    });

    it("should produce different ciphertexts for same plaintext", async () => {
      const provider = new DefaultEncryptionProvider("test-password");
      const original = "Test data";

      const encrypted1 = await provider.encrypt(original);
      const encrypted2 = await provider.encrypt(original);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      const decrypted1 = await provider.decrypt(encrypted1);
      const decrypted2 = await provider.decrypt(encrypted2);
      expect(decrypted1).toBe(original);
      expect(decrypted2).toBe(original);
    });

    it("should handle unicode characters", async () => {
      const provider = new DefaultEncryptionProvider("test-password");
      const original = "Hello 世界 🌍 Привет";

      const encrypted = await provider.encrypt(original);
      const decrypted = await provider.decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it("should handle empty strings", async () => {
      const provider = new DefaultEncryptionProvider("test-password");
      const original = "";

      const encrypted = await provider.encrypt(original);
      const decrypted = await provider.decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it("should handle large data", async () => {
      const provider = new DefaultEncryptionProvider("test-password");
      const original = "X".repeat(10000);

      const encrypted = await provider.encrypt(original);
      const decrypted = await provider.decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it("should fail to decrypt with wrong password", async () => {
      const provider1 = new DefaultEncryptionProvider("password1");
      const provider2 = new DefaultEncryptionProvider("password2");
      const original = "Secret data";

      const encrypted = await provider1.encrypt(original);

      // Should throw when trying to decrypt with different password
      await expect(provider2.decrypt(encrypted)).rejects.toThrow();
    });

    it("should use custom salt", async () => {
      const provider1 = new DefaultEncryptionProvider(
        "password",
        "salt1",
      );
      const provider2 = new DefaultEncryptionProvider(
        "password",
        "salt2",
      );
      const original = "Test data";

      const encrypted = await provider1.encrypt(original);

      // Different salts should result in incompatible encryption
      await expect(provider2.decrypt(encrypted)).rejects.toThrow();
    });
  });

  describe("Custom EncryptionProvider", () => {
    class SimpleEncryption implements EncryptionProvider {
      encrypt(data: string): string {
        // Simple XOR "encryption" for testing
        return btoa(
          data.split("").map((c) =>
            String.fromCharCode(
              c.charCodeAt(0) ^ 42,
            )
          ).join(""),
        );
      }

      decrypt(encrypted: string): string {
        const decoded = atob(encrypted);
        return decoded.split("").map((c) =>
          String.fromCharCode(
            c.charCodeAt(0) ^ 42,
          )
        ).join("");
      }
    }

    it("should work with custom encryption implementation", () => {
      const provider = new SimpleEncryption();
      const original = "Test message";

      const encrypted = provider.encrypt(original);
      const decrypted = provider.decrypt(encrypted);

      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
    });
  });
});

describe("EncryptedStorageAdapter", () => {
  describe("Basic Operations", () => {
    let storage: EncryptedStorageAdapter<{ count: number }>;

    beforeEach(() => {
      storage = new EncryptedStorageAdapter({
        storage: new MemorySessionStorage<string>(),
        password: "test-password",
      });
    });

    it("should write and read encrypted data", async () => {
      const data = { count: 42 };
      await storage.write("key1", data);

      const retrieved = await storage.read("key1");
      expect(retrieved).toEqual(data);
    });

    it("should return undefined for non-existent keys", async () => {
      const result = await storage.read("non-existent");
      expect(result).toBeUndefined();
    });

    it("should delete data", async () => {
      const data = { count: 10 };
      await storage.write("key1", data);
      await storage.delete("key1");

      const result = await storage.read("key1");
      expect(result).toBeUndefined();
    });

    it("should handle multiple keys independently", async () => {
      const data1 = { count: 1 };
      const data2 = { count: 2 };

      await storage.write("key1", data1);
      await storage.write("key2", data2);

      const retrieved1 = await storage.read("key1");
      const retrieved2 = await storage.read("key2");

      expect(retrieved1).toEqual(data1);
      expect(retrieved2).toEqual(data2);
    });

    it("should overwrite existing data", async () => {
      await storage.write("key1", { count: 1 });
      await storage.write("key1", { count: 2 });

      const result = await storage.read("key1");
      expect(result).toEqual({ count: 2 });
    });
  });

  describe("Data Encryption", () => {
    it("should actually encrypt data in underlying storage", async () => {
      const underlyingStorage = new MemorySessionStorage<string>();
      const encryptedStorage = new EncryptedStorageAdapter({
        storage: underlyingStorage,
        password: "secret",
      });

      const data = { secret: "my-secret-data" };
      await encryptedStorage.write("key1", data);

      // Check that underlying storage contains encrypted (non-JSON) data
      const rawData = await underlyingStorage.read("key1");
      expect(rawData).toBeDefined();
      expect(typeof rawData).toBe("string");

      // Should not be able to parse as JSON directly
      expect(() => JSON.parse(rawData!)).toThrow();

      // Should not contain the plaintext
      expect(rawData).not.toContain("my-secret-data");
    });

    it("should fail to decrypt with different password", async () => {
      const underlyingStorage = new MemorySessionStorage<string>();

      const storage1 = new EncryptedStorageAdapter({
        storage: underlyingStorage,
        password: "password1",
      });

      await storage1.write("key1", { data: "test" });

      const storage2 = new EncryptedStorageAdapter({
        storage: underlyingStorage,
        password: "password2",
      });

      // Should fail to decrypt
      await expect(storage2.read("key1")).rejects.toThrow(/decrypt/i);
    });
  });

  describe("Custom Encryption Provider", () => {
    class ReverseEncryption implements EncryptionProvider {
      encrypt(data: string): string {
        return btoa(data.split("").reverse().join(""));
      }

      decrypt(encrypted: string): string {
        return atob(encrypted).split("").reverse().join("");
      }
    }

    it("should use custom encryption provider", async () => {
      const storage = new EncryptedStorageAdapter({
        storage: new MemorySessionStorage<string>(),
        encryptionProvider: new ReverseEncryption(),
      });

      const data = { value: "test" };
      await storage.write("key1", data);

      const retrieved = await storage.read("key1");
      expect(retrieved).toEqual(data);
    });
  });

  describe("Complex Data Types", () => {
    // deno-lint-ignore no-explicit-any
    let storage: EncryptedStorageAdapter<any>;

    beforeEach(() => {
      storage = new EncryptedStorageAdapter({
        storage: new MemorySessionStorage<string>(),
        password: "test",
      });
    });

    it("should handle nested objects", async () => {
      const data = {
        user: {
          name: "John",
          settings: {
            theme: "dark",
            notifications: true,
          },
        },
      };

      await storage.write("key1", data);
      const result = await storage.read("key1");
      expect(result).toEqual(data);
    });

    it("should handle arrays", async () => {
      const data = [1, 2, 3, { nested: "value" }];

      await storage.write("key1", data);
      const result = await storage.read("key1");
      expect(result).toEqual(data);
    });

    it("should handle null values", async () => {
      const data = { value: null };

      await storage.write("key1", data);
      const result = await storage.read("key1");
      expect(result).toEqual(data);
    });
  });

  describe("Configuration", () => {
    it("should require either password or encryptionProvider", () => {
      expect(() => {
        new EncryptedStorageAdapter({
          storage: new MemorySessionStorage<string>(),
        });
      }).toThrow(/password/i);
    });

    it("should accept custom salt", async () => {
      const storage = new EncryptedStorageAdapter({
        storage: new MemorySessionStorage<string>(),
        password: "test",
        salt: "custom-salt",
      });

      await storage.write("key1", { data: "test" });
      const result = await storage.read("key1");
      expect(result).toEqual({ data: "test" });
    });
  });
});
