export type Brand<T, K> = T & { __brand: K };

export type ImageId = Brand<string, 'ImageId'>;
export type UserId = Brand<string, 'UserId'>;
export type PostId = Brand<string, 'PostId'>;
export type CommentId = Brand<string, 'CommentId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
