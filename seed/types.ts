export type Success<T> = {
  success: true;
  data: T;
};
export type Fail = {
  success: false;
};
export type Result<T> = Success<T> | Fail;
