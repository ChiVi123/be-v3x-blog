import { DomainException } from './base.exception';

export class UnauthorizedException extends DomainException {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenException extends DomainException {
  readonly code = 'FORBIDDEN';

  constructor(message = 'Forbidden resource') {
    super(message);
  }
}
