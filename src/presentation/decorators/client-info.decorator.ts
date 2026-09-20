import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ClientContext } from '~application/types/use-case.type';

export function extractClientContext(req: Request): ClientContext {
  const forwarded = req.headers['x-forwarded-for'];
  let ipAddress: string | undefined;

  if (typeof forwarded === 'string') {
    ipAddress = forwarded.split(',')[0]?.trim();
  } else if (Array.isArray(forwarded)) {
    ipAddress = forwarded[0]?.trim();
  }

  if (!ipAddress) {
    ipAddress = req.ip;
  }

  return {
    ipAddress: ipAddress || '0.0.0.0',
    userAgent: req.headers['user-agent'] || 'Unknown',
  };
}

export const ClientInfo = createParamDecorator((_data: unknown, ctx: ExecutionContext): ClientContext => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return extractClientContext(req);
});
