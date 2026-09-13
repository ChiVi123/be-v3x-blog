import { DomainException } from './base.exception';

export class InvalidCredentialsException extends DomainException {
  readonly code = 'INVALID_CREDENTIALS';

  constructor(message = 'Invalid email or password') {
    super(message);
  }
}
