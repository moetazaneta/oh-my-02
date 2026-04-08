import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { commandRegistry } from "./discord/commands/index.js";
import { logger } from "./lib/logger.js";

function validateEnv(): {
  token: string;
  clientId: string;
  convexUrl: string;
} {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const convexUrl = process.env.CONVEX_URL;

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is required");
  }
  if (!clientId) {
    throw new Error("DISCORD_CLIENT_ID environment variable is required");
  }
  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is required");
  }

  return { token, clientId, convexUrl };
}

const { token, clientId, convexUrl } = validateEnv();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const convex = new ConvexHttpClient(convexUrl);

client.on("clientReady", async () => {
  if (!client.user) {
    throw new Error("Client user not available after ready event");
  }

  logger.debug(`Ready! Logged in as ${client.user.tag}`);

  const rest = new REST().setToken(token);

  try {
    const commands = Array.from(commandRegistry.values()).map((handler) => handler.data.toJSON());

    if (commands.length > 0) {
      logger.debug(`Registering ${commands.length} slash command(s) globally...`);
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      logger.debug("Slash commands registered successfully");
    } else {
      logger.debug("No commands registered in command registry");
    }
  } catch (error) {
    logger.error("Failed to register slash commands:", error);
  }
});

client.on("guildCreate", async (guild) => {
  logger.debug(`Bot joined guild: ${guild.name} (${guild.id})`);

  try {
    await convex.mutation("mutations/guilds:addGuild" as unknown as FunctionReference<"mutation">, {
      guildId: guild.id,
    });
    logger.debug(`Guild ${guild.id} registered in Convex`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      logger.debug(`Guild ${guild.id} already registered`);
    } else {
      logger.error(`Failed to register guild ${guild.id}:`, error);
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commandRegistry.get(interaction.commandName);
  if (!command) {
    logger.debug(`Unknown command: ${interaction.commandName}`);
    await interaction.reply({
      content: "Unknown command",
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction, convex);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await (interaction.replied || interaction.deferred
      ? interaction.editReply({
          content: `An error occurred: ${errorMessage}`,
        })
      : interaction.reply({
          content: `An error occurred: ${errorMessage}`,
          ephemeral: true,
        }));
  }
});

client.login(token);
