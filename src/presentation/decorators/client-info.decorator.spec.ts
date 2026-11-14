import { describe, expect, it } from 'bun:test';
import type { Request } from 'express';
import { extractClientContext } from './client-info.decorator';

describe('extractClientContext', () => {
  it('should fallback userAgent to Unknown when user-agent header is missing', () => {
    const req = {
      headers: {},
    } as unknown as Request;

    const result = extractClientContext(req);

    expect(result.userAgent).toBe('Unknown');
  });
});
