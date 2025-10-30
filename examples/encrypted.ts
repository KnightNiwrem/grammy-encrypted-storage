/**
 * Example: Using EncryptedStorageAdapter with the vault plugin
 *
 * This example demonstrates how to use encrypted storage with grammY.
 * Data is automatically encrypted before being written to storage and
 * decrypted when read.
 *
 * Run with:
 * BOT_TOKEN="your-token" deno run --allow-net --allow-env examples/encrypted.ts
 */

import { Bot, MemorySessionStorage } from "grammy";
import {
  EncryptedStorageAdapter,
  vault,
  type VaultData,
  type VaultEntry,
  type VaultFlavor,
} from "../src/mod.ts";

// Get bot token from environment
const token = Deno.env.get("BOT_TOKEN");
if (!token) {
  console.error("BOT_TOKEN environment variable is required!");
  Deno.exit(1);
}

// Type for our bot context
type MyContext = VaultFlavor;

// Create bot
const bot = new Bot<MyContext>(token);

// Create encrypted storage
// In production, store the password securely (e.g., in environment variables)
const encryptedStorage = new EncryptedStorageAdapter<VaultData>({
  storage: new MemorySessionStorage<string>(),
  password: Deno.env.get("ENCRYPTION_PASSWORD") || "demo-password-change-me",
  salt: "grammy-vault-demo",
});

// Install vault plugin with encrypted storage
bot.use(vault({
  storage: encryptedStorage,
}));

// Command: /start
bot.command("start", (ctx) => {
  ctx.reply(
    "🔐 Welcome to the Encrypted Text Vault Bot!\n\n" +
      "Your data is encrypted at rest using AES-GCM.\n\n" +
      "Commands:\n" +
      "/save <text> - Save text to your vault\n" +
      "/list - List all your vault entries\n" +
      "/delete <id> - Delete an entry (use short ID)\n" +
      "/clear - Clear your entire vault\n" +
      "/count - Count your vault entries",
  );
});

// Command: /save <text>
bot.command("save", (ctx) => {
  const text = ctx.match.trim();
  if (!text) {
    return ctx.reply(
      "❌ Please provide text to save!\n\nExample: /save My secret note",
    );
  }

  const entry: VaultEntry = {
    id: crypto.randomUUID(),
    text,
    createdAt: Date.now(),
  };

  ctx.vault.entries.push(entry);

  // Show short ID for easier deletion
  const shortId = entry.id.split("-")[0];
  ctx.reply(
    `✅ Saved and encrypted!\n\n` +
      `ID: ${shortId}\n` +
      `Entry ${ctx.vault.entries.length} of your vault`,
  );
});

// Command: /list
bot.command("list", (ctx) => {
  const entries = ctx.vault.entries;

  if (entries.length === 0) {
    return ctx.reply("📭 Your vault is empty!\n\nUse /save to add entries.");
  }

  const list = entries.map((entry, index) => {
    const shortId = entry.id.split("-")[0];
    const date = new Date(entry.createdAt).toLocaleDateString();
    return `${index + 1}. ${entry.text}\n   📅 ${date} | 🆔 ${shortId}`;
  }).join("\n\n");

  ctx.reply(`🔐 Your encrypted vault (${entries.length} entries):\n\n${list}`);
});

// Command: /delete <id>
bot.command("delete", (ctx) => {
  const idPrefix = ctx.match.trim();
  if (!idPrefix) {
    return ctx.reply(
      "❌ Please provide the entry ID!\n\nExample: /delete abc123",
    );
  }

  const index = ctx.vault.entries.findIndex((e) => e.id.startsWith(idPrefix));
  if (index === -1) {
    return ctx.reply(`❌ Entry not found!\n\nUse /list to see all entries.`);
  }

  ctx.vault.entries.splice(index, 1);
  ctx.reply(
    `✅ Entry deleted!\n\n${ctx.vault.entries.length} entries remaining.`,
  );
});

// Command: /clear
bot.command("clear", (ctx) => {
  const count = ctx.vault.entries.length;
  ctx.vault.entries = [];
  ctx.reply(`✅ Vault cleared!\n\n${count} entries removed.`);
});

// Command: /count
bot.command("count", (ctx) => {
  const count = ctx.vault.entries.length;
  const plural = count === 1 ? "entry" : "entries";
  ctx.reply(`📊 You have ${count} ${plural} in your encrypted vault.`);
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
