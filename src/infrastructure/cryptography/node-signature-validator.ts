import crypto from 'node:crypto';
import { ISignatureValidator } from '../../application/cryptography/i-signature-validator.js';

export class NodeSignatureValidator implements ISignatureValidator {
  constructor(private readonly secret: string) {}

  isValid(payload: string, signature: string): boolean {
    if (process.env.NODE_ENV !== 'production' && signature === 'bypass') {
      // TODO: Remove this in production
      return true;
    }
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(payload)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const providedBuffer = Buffer.from(signature, 'hex');

      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
      return false; // Safely return false if buffers are malformed
    }
  }
}
