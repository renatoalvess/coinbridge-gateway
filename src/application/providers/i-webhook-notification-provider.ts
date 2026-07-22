export interface IWebhookNotificationProvider {
  send(url: string, payload: Record<string, unknown>, secret: string): Promise<boolean>;
}
