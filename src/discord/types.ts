import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ConvexHttpClient } from "convex/browser";

export interface CommandHandler {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction, convex: ConvexHttpClient) => Promise<void>;
}
