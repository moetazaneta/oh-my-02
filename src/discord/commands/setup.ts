import type { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { CommandHandler } from "../types.js";

export const setupCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure the default channel for activity updates")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where activity updates will be posted")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) as SlashCommandBuilder,

  execute: async (interaction: ChatInputCommandInteraction, convex: ConvexHttpClient) => {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.guildId) {
      await interaction.editReply("❌ This command can only be used in a server.");
      return;
    }

    const channel = interaction.options.getChannel("channel", true);

    if (channel.type !== ChannelType.GuildText) {
      await interaction.editReply("❌ Please select a text channel.");
      return;
    }

    const botMember = interaction.guild?.members.me;
    if (botMember && interaction.guild) {
      const guildChannel = await interaction.guild.channels.fetch(channel.id);
      if (guildChannel?.isTextBased()) {
        const permissions = guildChannel.permissionsFor(botMember);
        if (!permissions?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
          await interaction.editReply(
            `⚠️ Warning: I don't have permission to send messages or embed links in ${channel}. Please grant me these permissions.`,
          );
        }
      }
    }

    try {
      await convex.mutation(
        "mutations/guilds:updateGuild" as unknown as FunctionReference<"mutation">,
        {
          guildId: interaction.guildId,
          defaultChannelId: channel.id,
        },
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        await convex.mutation(
          "mutations/guilds:addGuild" as unknown as FunctionReference<"mutation">,
          {
            guildId: interaction.guildId,
            defaultChannelId: channel.id,
          },
        );
      } else {
        throw error;
      }
    }

    await interaction.editReply(`✅ Activity updates will be posted to ${channel}`);
  },
};
