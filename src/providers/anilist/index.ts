import type { UnifiedActivity } from "../../types/activity.js";
import type { IActivityProvider } from "../base.js";
import { AniListClient } from "./client.js";
import { mapAniListActivityToUnified } from "./mapper.js";
import { type AniListActivitySchema as AniListActivity, AniListActivitySchema } from "./schemas.js";

function isKnownActivity(a: unknown): a is AniListActivity {
  return AniListActivitySchema.safeParse(a).success;
}

export class AniListProvider implements IActivityProvider {
  public readonly providerType = "anilist";
  private client = new AniListClient();

  async fetchRecentActivities(
    userId: string,
    sinceActivityId?: string,
  ): Promise<UnifiedActivity[]> {
    const response = await this.client.fetchUserActivities(userId, 1);

    let activities = response.data.Page.activities.filter(isKnownActivity);

    if (sinceActivityId) {
      const sinceId = Number.parseInt(sinceActivityId, 10);
      activities = activities.filter((a) => a.id > sinceId);
    }

    return activities.map(mapAniListActivityToUnified);
  }

  async resolveUserId(usernameOrId: string): Promise<string> {
    return this.client.resolveUserId(usernameOrId);
  }
}

export default AniListProvider;
