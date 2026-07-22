import { describe, it, expect } from 'vitest';

describe('Environment Validation', () => {
  it('shold run vitest correctly', () => {
    const resultado: number = 1 + 1;
    expect(resultado).toBe(2);
  });

  it('shold resolve path aliases (#src/)', async () => {
    const modulo = await import('#src/lib/env.js');
    expect(modulo.env).toBeDefined();
  });
});
