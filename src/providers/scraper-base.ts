import type { IActivityProvider } from "./base.js";
import type { UnifiedActivity } from "../types/index.js";

export abstract class ScraperProvider implements IActivityProvider {
  abstract readonly providerType: string;

  async fetchRecentActivities(
    _userId: string,
    _sinceActivityId?: string,
  ): Promise<UnifiedActivity[]> {
    throw new Error("ScraperProvider.fetchRecentActivities not implemented");
  }

  async resolveUserId(_usernameOrId: string): Promise<string> {
    throw new Error("ScraperProvider.resolveUserId not implemented");
  }
}
