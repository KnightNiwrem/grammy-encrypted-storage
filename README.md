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
import { Bot, Context, MemorySessionStorage, session } from "grammy";
import { EncryptedStorageAdapter } from "./src/mod.ts";

const bot = new Bot("YOUR_BOT_TOKEN");

interface SessionData {
  counter: number;
}

// Wrap any storage adapter with encryption
const encryptedStorage = new EncryptedStorageAdapter<SessionData>({
  storage: new MemorySessionStorage<string>(),
  password: "your-secret-password",
});

// Use with session middleware
bot.use(session({
  initial: () => ({ counter: 0 }),
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

## Example Usage

This plugin includes a complete example demonstrating encrypted sessions:

```typescript
import { Bot, Context, MemorySessionStorage, session } from "grammy";
import { EncryptedStorageAdapter } from "./src/mod.ts";

const bot = new Bot("YOUR_BOT_TOKEN");

interface SessionData {
  counter: number;
  notes: string[];
}

interface MyContext extends Context {
  session: SessionData;
}

// Use encrypted storage for sessions
const encryptedStorage = new EncryptedStorageAdapter<SessionData>({
  storage: new MemorySessionStorage<string>(),
  password: "my-secret-key",
});

bot.use(session({
  initial: (): SessionData => ({ counter: 0, notes: [] }),
  storage: encryptedStorage,
}));

// Example: Increment counter
bot.command("count", (ctx) => {
  ctx.session.counter++;
  ctx.reply(`Counter: ${ctx.session.counter}`);
});

// Example: Add note
bot.command("note", (ctx) => {
  const text = ctx.match.trim();
  if (!text) return ctx.reply("Please provide text for the note.");

  ctx.session.notes.push(text);
  ctx.reply("Note saved and encrypted!");
});

// Example: List notes
bot.command("notes", (ctx) => {
  if (ctx.session.notes.length === 0) {
    return ctx.reply("You have no notes yet.");
  }
  const list = ctx.session.notes
    .map((note, i) => `${i + 1}. ${note}`)
    .join("\n");
  ctx.reply(`Your notes:\n\n${list}`);
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

An example bot is provided in `examples/encrypted.ts`. To run it:

1. Set your bot token as an environment variable:
   ```bash
   export BOT_TOKEN="your-token-here"
   ```
2. Run the example file:
   ```bash
   deno run --allow-net --allow-env examples/encrypted.ts
   ```

The example bot supports encrypted session storage with commands: `/start`, `/count`, `/note <text>`, `/notes`, and `/clear`.

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

bot.use(session({ storage: encryptedPostgres }));

// Redis with encryption
import { RedisAdapter } from "@grammyjs/storage-redis";

const encryptedRedis = new EncryptedStorageAdapter({
  storage: new RedisAdapter({ url: "redis://localhost:6379" }),
  password: "encryption-key",
});

bot.use(session({ storage: encryptedRedis }));

// File System with encryption
import { FileAdapter } from "@grammyjs/storage-file";

const encryptedFile = new EncryptedStorageAdapter({
  storage: new FileAdapter({ dirName: "vault-data" }),
  password: "encryption-key",
});

bot.use(session({ storage: encryptedFile }));
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
│   ├── mod.ts                # Main exports
│   ├── encryption.ts         # Encryption interface and default implementation
│   └── encrypted-adapter.ts  # Encrypted storage adapter
├── test/
│   └── encryption_test.ts    # Test suite
├── examples/
│   └── encrypted.ts          # Example bot
├── deno.json                 # Deno configuration
└── README.md                 # This file
```

## License

This project is licensed under the MIT License.
