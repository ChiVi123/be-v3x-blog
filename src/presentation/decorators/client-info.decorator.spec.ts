import { describe, expect, it } from 'bun:test';
import type { Request } from 'express';
import { extractClientContext } from './client-info.decorator';

describe('extractClientContext', () => {
  it('should extract first IP from x-forwarded-for header string', () => {
    const req = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      ip: '10.0.0.1',
    } as unknown as Request;

    const result = extractClientContext(req);

    expect(result).toEqual({
      ipAddress: '203.0.113.195',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });
  });

  it('should extract first IP from x-forwarded-for header array', () => {
    const req = {
      headers: {
        'x-forwarded-for': ['203.0.113.195', '70.41.3.18'],
      },
      ip: '10.0.0.1',
    } as unknown as Request;

    const result = extractClientContext(req);

    expect(result.ipAddress).toBe('203.0.113.195');
  });

  it('should fallback to req.ip when x-forwarded-for is missing', () => {
    const req = {
      headers: {},
      ip: '192.168.1.50',
    } as unknown as Request;

    const result = extractClientContext(req);

    expect(result.ipAddress).toBe('192.168.1.50');
  });

  it('should fallback to 0.0.0.0 when both x-forwarded-for and req.ip are missing', () => {
    const req = {
      headers: {},
    } as unknown as Request;

    const result = extractClientContext(req);

    expect(result.ipAddress).toBe('0.0.0.0');
  });

  it('should fallback userAgent to Unknown when user-agent header is missing', () => {
    const req = {
      headers: {},
    } as unknown as Request;

    const result = extractClientContext(req);

    expect(result.userAgent).toBe('Unknown');
  });
});
