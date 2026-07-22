export interface ISignatureValidator {
  isValid(payload: string, signature: string): boolean;
}
