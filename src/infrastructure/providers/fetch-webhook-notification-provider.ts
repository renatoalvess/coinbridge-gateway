import { IWebhookNotificationProvider } from '../../application/providers/i-webhook-notification-provider.js';
import crypto from 'crypto';

export class FetchWebhookNotificationProvider implements IWebhookNotificationProvider {
  async send(
    url: string,
    payload: Record<string, unknown>,
    secret: string,
  ): Promise<boolean> {
    const body = JSON.stringify(payload);

    // Calcula a assinatura HMAC-SHA256 do payload usando a API Key como secret
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // Retorna true se o status for HTTP 2xx (Sucesso)
      return response.ok;
    } catch (error) {
      console.error(
        `[WebhookProvider] Error sending webhook to ${url}:`,
        error,
      );
      // Retorna false para indicar erro de rede e forçar o retry no Worker
      return false;
    }
  }
}
