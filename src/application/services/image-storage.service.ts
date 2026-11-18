export type StoredImage = {
  remoteKey: string;
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
};

export interface ImageStorageService {
  upload(file: Buffer): Promise<StoredImage>;
}
