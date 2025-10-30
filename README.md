# grammY Encrypted Storage

An enhanced storage adapter for the grammY framework that adds encryption to any existing `StorageAdapter`. This plugin encrypts data before writing to storage and decrypts it when reading, ensuring your bot's stored data remains secure.

## Features

- **🔐 Encryption by Default**: Built-in AES-GCM encryption using Web Crypto API
- **🔌 Pluggable Encryption**: Bring your own encryption implementation via the `EncryptionProvider` interface
- **🔄 Storage Agnostic**: Works with any existing grammY `StorageAdapter`
- **🛡️ Type-Safe**: Fully typed with TypeScript
- **✅ Well-Tested**: Comprehensive test suite included
- **📦 Zero Dependencies**: Uses standard Web Crypto API (Deno/Node.js compatible)

## Quick Start

### Basic Usage with Default Encryption

```typescript
import { Bot, MemorySessionStorage } from "grammy";
import { EncryptedStorageAdapter } from "./src/mod.ts";

const bot = new Bot("YOUR_BOT_TOKEN");

// Wrap any storage adapter with encryption
const encryptedStorage = new EncryptedStorageAdapter({
  storage: new MemorySessionStorage<string>(),
  password: "your-secret-password",
});

// Use with the vault plugin or session middleware
bot.use(vault({
  storage: encryptedStorage,
}));
```

### Using Custom Encryption

Implement the `EncryptionProvider` interface to use your own encryption:

```typescript
import { EncryptedStorageAdapter, EncryptionProvider } from "./src/mod.ts";

class MyCustomEncryption implements EncryptionProvider {
  async encrypt(data: string): Promise<string> {
    // Your encryption logic
    return myEncrypt(data);
  }

  async decrypt(encrypted: string): Promise<string> {
    // Your decryption logic
    return myDecrypt(encrypted);
  }
}

const storage = new EncryptedStorageAdapter({
  storage: new MemorySessionStorage<string>(),
  encryptionProvider: new MyCustomEncryption(),
});
```

## Text Vault Example

This plugin includes a complete "text vault" example demonstrating encrypted storage:

```typescript
import { Bot, MemorySessionStorage } from "grammy";
import { EncryptedStorageAdapter, vault, type VaultData } from "./src/mod.ts";

const bot = new Bot("YOUR_BOT_TOKEN");

// Use encrypted storage for the vault
const encryptedStorage = new EncryptedStorageAdapter<VaultData>({
  storage: new MemorySessionStorage<string>(),
  password: "my-secret-key",
});

bot.use(vault({
  storage: encryptedStorage,
}));

// Example: Save text to the vault
bot.command("save", (ctx) => {
  const text = ctx.match;
  if (!text) return ctx.reply("Please provide text to save.");

  ctx.vault.entries.push({
    id: crypto.randomUUID(),
    text,
    createdAt: Date.now(),
  });
  ctx.reply("Saved to your vault!");
});

// Example: List all entries
bot.command("list", (ctx) => {
  if (ctx.vault.entries.length === 0) {
    return ctx.reply("Your vault is empty.");
  }
  const list = ctx.vault.entries
    .map((e, i) => `${i + 1}. ${e.text}`)
    .join("\n");
  ctx.reply(`Your vault:\n\n${list}`);
});

// Example: Delete an entry
bot.command("delete", (ctx) => {
  const id = ctx.match;
  const index = ctx.vault.entries.findIndex((e) => e.id.startsWith(id));
  if (index === -1) return ctx.reply("Entry not found.");
  ctx.vault.entries.splice(index, 1);
  ctx.reply("Deleted!");
});

bot.start();
```

## API Reference

### `EncryptedStorageAdapter<T>`

The main class that wraps any `StorageAdapter` to add encryption.

**Constructor Options:**

```typescript
interface EncryptedStorageOptions<T> {
  storage: StorageAdapter<string>; // Underlying storage adapter
  password?: string; // Password for default encryption
  salt?: string; // Optional salt for key derivation
  encryptionProvider?: EncryptionProvider; // Custom encryption implementation
}
```

**Note**: Either `password` or `encryptionProvider` must be provided.

### `EncryptionProvider` Interface

Implement this interface to provide custom encryption:

```typescript
interface EncryptionProvider {
  encrypt(data: string): Promise<string> | string;
  decrypt(encrypted: string): Promise<string> | string;
}
```

### `DefaultEncryptionProvider`

The default encryption implementation using AES-GCM with PBKDF2 key derivation:

```typescript
const provider = new DefaultEncryptionProvider(
  "password", // Required: encryption password
  "custom-salt", // Optional: salt for key derivation
);
```

**Security Features:**

- AES-GCM 256-bit encryption
- PBKDF2 key derivation with 100,000 iterations
- Random IV for each encryption operation
- SHA-256 hashing

## Running the Example

An example bot is provided in `example.ts`. To run it:

1. Set your bot token as an environment variable:
   ```bash
   export BOT_TOKEN="your-token-here"
   ```
2. Run the example file:
   ```bash
   deno run --allow-net --allow-env example.ts
   ```

The example bot supports the following commands: `/start`, `/save <text>`, `/list`, `/delete <id>`, `/clear`, and `/count`.

## Persistent Storage Examples

The encrypted storage adapter works with any `StorageAdapter`. Here are examples using various storage backends:

```typescript
// PostgreSQL with encryption
import { PostgresAdapter } from "@grammyjs/storage-postgres";
import { EncryptedStorageAdapter } from "./src/mod.ts";

const encryptedPostgres = new EncryptedStorageAdapter({
  storage: new PostgresAdapter({
    host: "localhost",
    database: "mybot",
  }),
  password: "encryption-key",
});

bot.use(vault({ storage: encryptedPostgres }));

// Redis with encryption
import { RedisAdapter } from "@grammyjs/storage-redis";

const encryptedRedis = new EncryptedStorageAdapter({
  storage: new RedisAdapter({ url: "redis://localhost:6379" }),
  password: "encryption-key",
});

bot.use(vault({ storage: encryptedRedis }));

// File System with encryption
import { FileAdapter } from "@grammyjs/storage-file";

const encryptedFile = new EncryptedStorageAdapter({
  storage: new FileAdapter({ dirName: "vault-data" }),
  password: "encryption-key",
});

bot.use(vault({ storage: encryptedFile }));
```

## Customization

### Custom Encryption Algorithm

Create your own encryption by implementing the `EncryptionProvider` interface:

```typescript
import { EncryptionProvider } from "./src/mod.ts";

class MyEncryption implements EncryptionProvider {
  async encrypt(data: string): Promise<string> {
    // Use any encryption library or algorithm
    return await yourEncryptionMethod(data);
  }

  async decrypt(encrypted: string): Promise<string> {
    return await yourDecryptionMethod(encrypted);
  }
}

const storage = new EncryptedStorageAdapter({
  storage: myStorageAdapter,
  encryptionProvider: new MyEncryption(),
});
```

### Vault Data Structure

You can modify the data structure stored by the plugin by editing the `VaultData` interface in `src/plugin.ts`.

```typescript
export interface VaultData {
  entries: VaultEntry[];
  // Add your own properties here
}
```

### Storage Key

By default, data is stored on a per-user basis. You can change this behavior by providing a `getStorageKey` function.

```typescript
// Store data per chat
bot.use(vault({
  storage: myStorage,
  getStorageKey: (ctx) => ctx.chat?.id.toString(),
}));
```

## Development

This project includes several Deno tasks to help with development:

- `deno task fmt`: Format the code.
- `deno task lint`: Lint the code.
- `deno task test`: Run the test suite.
- `deno task check`: Type-check the code.
- `deno task ok`: Run all checks.

## Project Structure

```
.
├── src/
│   ├── mod.ts          # Main exports
│   └── plugin.ts       # Vault plugin implementation
├── test/
│   └── plugin_test.ts  # Test suite
├── example.ts          # Example bot
├── deno.json           # Deno configuration
└── README.md           # This file
```

## License

This project is licensed under the MIT License.
