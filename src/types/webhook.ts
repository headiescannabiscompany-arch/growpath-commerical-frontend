import type { NotificationType } from "./notification";

export type Webhook = {
  id: string;
  facilityId: string;
  url: string;
  events: NotificationType[];
  enabled: boolean;
};
