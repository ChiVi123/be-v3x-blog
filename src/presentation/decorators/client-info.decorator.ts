import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ClientContext } from '~application/types/use-case.type';

export function extractClientContext(req: Request): ClientContext {
  return {
    ipAddress: req.ip || '0.0.0.0',
    userAgent: req.headers['user-agent'] || 'Unknown',
  };
}

export const ClientInfo = createParamDecorator((_data: unknown, ctx: ExecutionContext): ClientContext => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return extractClientContext(req);
});
