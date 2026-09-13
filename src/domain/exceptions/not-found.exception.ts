import { DomainException } from './base.exception';

export class EntityNotFoundException extends DomainException {
  readonly code = 'ENTITY_NOT_FOUND';

  constructor(entityName: string, identifier?: string | number) {
    super(identifier ? `${entityName} with ID ${identifier} not found` : `${entityName} not found`);
  }
}
