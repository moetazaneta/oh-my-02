import type { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { type ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { logger } from "../../lib/logger.js";
import type { CommandHandler } from "../types.js";

export const statusCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Display current activity bot configuration and tracked users"),

  execute: async (interaction: ChatInputCommandInteraction, convex: ConvexHttpClient) => {
    await interaction.deferReply();

    if (!interaction.guildId) {
      await interaction.editReply("❌ This command can only be used in a server.");
      return;
    }

    try {
      const [guild, trackedUsers] = await Promise.all([
        convex.query("queries/guilds:getGuild" as unknown as FunctionReference<"query">, {
          guildId: interaction.guildId,
        }),
        convex.query(
          "queries/trackedUsers:listTrackedUsers" as unknown as FunctionReference<"query">,
          {
            guildId: interaction.guildId,
          },
        ),
      ]);

      const embed = new EmbedBuilder().setTitle("📊 Activity Bot Status").setColor(0x3b88c3);

      const defaultChannel = guild?.defaultChannelId
        ? `<#${guild.defaultChannelId}>`
        : "Not set (use `/setup`)";
      embed.addFields({
        name: "Default Channel",
        value: defaultChannel,
        inline: false,
      });

      const filter = guild?.defaultActivityFilter;
      let filterText = "None (showing all activities)";
      if (filter) {
        const parts: string[] = [];
        if (filter.ignoredActivityTypes && filter.ignoredActivityTypes.length > 0) {
          parts.push(
            `**Activity Types:** ${filter.ignoredActivityTypes.map((t: string) => `\`${t}\``).join(", ")}`,
          );
        }
        if (filter.ignoredMediaStatuses && filter.ignoredMediaStatuses.length > 0) {
          parts.push(
            `**Media Statuses:** ${filter.ignoredMediaStatuses.map((s: string) => `\`${s}\``).join(", ")}`,
          );
        }
        if (filter.ignoredMediaTypes && filter.ignoredMediaTypes.length > 0) {
          parts.push(
            `**Media Types:** ${filter.ignoredMediaTypes.map((t: string) => `\`${t}\``).join(", ")}`,
          );
        }
        if (parts.length > 0) {
          filterText = parts.join("\n");
        }
      }
      embed.addFields({
        name: "Active Filters",
        value: filterText,
        inline: false,
      });

      let usersText = "No users tracked yet. Use `/track` to add one.";
      if (trackedUsers && trackedUsers.length > 0) {
        usersText = trackedUsers
          .map((user: { providerType: string; providerUserId: string; channelId?: string }) => {
            const channelDisplay = user.channelId
              ? `channel: <#${user.channelId}>`
              : "default channel";
            return `• **${user.providerType}**: ${user.providerUserId} (${channelDisplay})`;
          })
          .join("\n");
      }
      embed.addFields({
        name: "Tracked Users",
        value: usersText,
        inline: false,
      });

      embed.setFooter({ text: `Last checked: ${new Date().toLocaleString()}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error fetching status:", error);
      await interaction.editReply(
        "❌ Failed to fetch status. Please try again or contact support.",
      );
    }
  },
};
