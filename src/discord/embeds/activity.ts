import { EmbedBuilder } from "discord.js";
import type { UnifiedActivity } from "../../types/activity.js";

export function createActivityEmbed(activity: UnifiedActivity): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(getEmbedColor(activity));

  if (activity.providerUserName) {
    embed.setAuthor(
      activity.providerUserAvatarUrl
        ? { name: activity.providerUserName, iconURL: activity.providerUserAvatarUrl }
        : { name: activity.providerUserName },
    );
  }

  if (activity.mediaCoverUrl) {
    embed.setThumbnail(activity.mediaCoverUrl);
  }

  switch (activity.activityType) {
    case "progress":
      return buildProgressEmbed(embed, activity);
    case "status_change":
      return buildStatusChangeEmbed(embed, activity);
    case "score":
      return buildScoreEmbed(embed, activity);
    case "text":
      return buildTextEmbed(embed, activity);
  }
}

function getEmbedColor(activity: UnifiedActivity): number {
  if (activity.status === "COMPLETED") return 0x00ff00;
  if (activity.status === "CURRENT") return 0x3b88c3;
  if (activity.status === "PAUSED") return 0xffa500;
  if (activity.status === "DROPPED") return 0xff0000;
  if (activity.status === "PLANNING") return 0x808080;
  return 0x3b88c3;
}

function buildProgressEmbed(embed: EmbedBuilder, activity: UnifiedActivity): EmbedBuilder {
  const statusLabel = activity.rawStatusLabel ?? "watched episode";
  const displayText = activity.rawProgress
    ? `${capitalize(statusLabel)} ${activity.rawProgress}`
    : capitalize(statusLabel);

  embed.setTitle(activity.mediaTitle);
  embed.setDescription(displayText);

  if (activity.mediaUrl) {
    embed.setURL(activity.mediaUrl);
  }

  return embed;
}

function buildStatusChangeEmbed(embed: EmbedBuilder, activity: UnifiedActivity): EmbedBuilder {
  const statusLabel = activity.rawStatusLabel ?? formatStatusFallback(activity.status);

  embed.setTitle(activity.mediaTitle);
  embed.setDescription(capitalize(statusLabel));

  if (activity.mediaUrl) {
    embed.setURL(activity.mediaUrl);
  }

  return embed;
}

function buildScoreEmbed(embed: EmbedBuilder, activity: UnifiedActivity): EmbedBuilder {
  embed.setTitle(activity.mediaTitle);
  embed.setDescription(`Rated **${activity.score}/10**`);

  if (activity.mediaUrl) {
    embed.setURL(activity.mediaUrl);
  }

  return embed;
}

function buildTextEmbed(embed: EmbedBuilder, activity: UnifiedActivity): EmbedBuilder {
  embed.setDescription(activity.text ?? "No text content");

  if (activity.activityUrl) {
    embed.setURL(activity.activityUrl);
  }

  return embed;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Fallback status text when rawStatusLabel is unavailable */
function formatStatusFallback(status?: string): string {
  switch (status) {
    case "CURRENT":
      return "watching";
    case "COMPLETED":
      return "completed";
    case "PAUSED":
      return "paused";
    case "DROPPED":
      return "dropped";
    case "PLANNING":
      return "plans to watch";
    case "REPEATING":
      return "rewatching";
    default:
      return "unknown";
  }
}
