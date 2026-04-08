import type { UnifiedActivity } from "../types/index.js";

export interface IActivityProvider {
  readonly providerType: string;
  fetchRecentActivities(userId: string, sinceActivityId?: string): Promise<UnifiedActivity[]>;
  resolveUserId(usernameOrId: string): Promise<string>;
}
