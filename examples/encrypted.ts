/**
 * Example: Using EncryptedStorageAdapter with grammY sessions
 *
 * This example demonstrates how to use encrypted storage with grammY.
 * Data is automatically encrypted before being written to storage and
 * decrypted when read.
 *
 * Run with:
 * BOT_TOKEN="your-token" deno run --allow-net --allow-env examples/encrypted.ts
 */

import { Bot, Context, MemorySessionStorage, session } from "grammy";
import { EncryptedStorageAdapter } from "../src/mod.ts";

// Get bot token from environment
const token = Deno.env.get("BOT_TOKEN");
if (!token) {
  console.error("BOT_TOKEN environment variable is required!");
  Deno.exit(1);
}

// Define session data structure
interface SessionData {
  counter: number;
  notes: string[];
}

// Type for our bot context
interface MyContext extends Context {
  session: SessionData;
}

// Create bot
const bot = new Bot<MyContext>(token);

// Create encrypted storage
// In production, store the password securely (e.g., in environment variables)
const encryptedStorage = new EncryptedStorageAdapter<SessionData>({
  storage: new MemorySessionStorage<string>(),
  password: Deno.env.get("ENCRYPTION_PASSWORD") || "demo-password-change-me",
  salt: "grammy-session-demo",
});

// Install session middleware with encrypted storage
bot.use(session({
  initial: (): SessionData => ({ counter: 0, notes: [] }),
  storage: encryptedStorage,
}));

// Command: /start
bot.command("start", (ctx) => {
  ctx.reply(
    "🔐 Welcome to the Encrypted Session Bot!\n\n" +
      "Your session data is encrypted at rest using AES-GCM.\n\n" +
      "Commands:\n" +
      "/count - Increment and show counter\n" +
      "/note <text> - Add a note to your session\n" +
      "/notes - List all your notes\n" +
      "/clear - Clear all session data",
  );
});

// Command: /count
bot.command("count", (ctx) => {
  ctx.session.counter++;
  ctx.reply(
    `🔢 Counter: ${ctx.session.counter}\n\n` +
      `This value is encrypted in storage!`,
  );
});

// Command: /note <text>
bot.command("note", (ctx) => {
  const text = ctx.match.trim();
  if (!text) {
    return ctx.reply(
      "❌ Please provide text for the note!\n\nExample: /note Remember this",
    );
  }

  ctx.session.notes.push(text);
  ctx.reply(
    `✅ Note saved and encrypted!\n\n` +
      `You now have ${ctx.session.notes.length} note(s).`,
  );
});

// Command: /notes
bot.command("notes", (ctx) => {
  const notes = ctx.session.notes;

  if (notes.length === 0) {
    return ctx.reply("📭 You have no notes yet!\n\nUse /note to add one.");
  }

  const list = notes.map((note, index) => `${index + 1}. ${note}`).join("\n");
  ctx.reply(`📝 Your encrypted notes (${notes.length}):\n\n${list}`);
});

// Command: /clear
bot.command("clear", (ctx) => {
  ctx.session.counter = 0;
  ctx.session.notes = [];
  ctx.reply("✅ Session cleared! All encrypted data removed.");
});

// Handle unknown commands
bot.on("message", (ctx) => {
  ctx.reply(
    "❓ Unknown command. Use /start to see available commands.",
  );
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Start the bot
console.log("🚀 Bot starting with encrypted storage...");
console.log("🔐 Encryption: AES-GCM with PBKDF2 key derivation");
bot.start();
