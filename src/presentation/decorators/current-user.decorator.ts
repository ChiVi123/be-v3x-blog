import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from '~application/services/auth.service';

export function extractCurrentUser(
  req: Request,
  data?: keyof AccessTokenPayload,
): AccessTokenPayload | AccessTokenPayload[keyof AccessTokenPayload] | undefined {
  const user = req.user;
  if (!user) {
    return undefined;
  }
  return data ? user[data] : user;
}

export const CurrentUser = createParamDecorator((data: keyof AccessTokenPayload | undefined, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return extractCurrentUser(req, data);
});
