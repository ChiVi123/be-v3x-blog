import { DomainException } from './base.exception';

export class PostNotPublishableException extends DomainException {
  readonly code = 'POST_NOT_PUBLISHABLE';

  constructor(message = 'Post cannot be published') {
    super(message);
  }
}
