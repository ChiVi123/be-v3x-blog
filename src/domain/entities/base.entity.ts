export abstract class BaseEntity_legacy<T> {
  protected _id: T;
  protected _createdAt: Date;
  protected _updatedAt: Date | null | undefined;

  constructor(id: T, createdAt: Date, updatedAt: Date | null | undefined) {
    this._id = id;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id(): T {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date | null | undefined {
    return this._updatedAt;
  }
}

export interface BaseEntity<T> {
  id: T;
  createdAt: Date;
  updatedAt: Date | null | undefined;
}
