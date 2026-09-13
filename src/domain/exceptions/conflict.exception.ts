import { DomainException } from './base.exception';

export class ConflictException extends DomainException {
  readonly code: string = 'CONFLICT';

  constructor(message = 'Conflict') {
    super(message);
  }
}

export class UserAlreadyExistsException extends ConflictException {
  override readonly code = 'USER_ALREADY_EXISTS';

  constructor(message = 'User already exists') {
    super(message);
  }
}
