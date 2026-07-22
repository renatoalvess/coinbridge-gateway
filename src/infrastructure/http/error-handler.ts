import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { InvalidTransactionStateError } from '#src/domain/errors/invalid-transaction-state-error.js';
import { TransactionNotFoundError } from '#src/domain/errors/transaction-not-found-error.js';
import { InvalidSignatureError } from '#src/domain/errors/invalid-signature-error.js';
import { DoubleSpendingError } from '#src/domain/errors/double-spending-error.js';
import { MerchantNotFoundError } from '#src/domain/errors/merchant-not-found-error.js';
export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return reply
      .status(400)
      .send({ message: 'Erro de validação.', issues: error.format() });
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    const formattedIssues = error.validation.map((err) => ({
      field: err.instancePath.replace('/', ''),
      message: err.message,
    }));
    return reply
      .status(400)
      .send({ message: 'Erro de validação.', issues: formattedIssues });
  }
  if (error instanceof InvalidSignatureError) {
    return reply.status(401).send({ message: error.message });
  }

  if (error instanceof MerchantNotFoundError) {
    return reply.status(400).send({ message: error.message });
  }

  if (error instanceof DoubleSpendingError) {
    return reply
      .status(202)
      .send({ message: 'Already processed (Idempotent)' });
  }

  if (error instanceof InvalidTransactionStateError) {
    return reply.status(409).send({ message: error.message });
  }

  if (error instanceof TransactionNotFoundError) {
    return reply.status(404).send({ message: error.message });
  }

  request.log.error(error);
  return reply.status(500).send({ message: 'Erro interno no servidor.' });
}
