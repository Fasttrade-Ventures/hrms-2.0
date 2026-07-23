export type R2UploadInput = {
  organizationId: string;
  category: string;
  fileName: string;
  contentType: string;
  body: Uint8Array;
};

export type R2ObjectRef = {
  key: string;
  bucket: string;
};

export type SignedUrlOptions = {
  expiresInSeconds?: number;
};

export interface R2StorageAdapter {
  buildKey(input: Pick<R2UploadInput, "organizationId" | "category" | "fileName">): string;
  getSignedDownloadUrl(ref: R2ObjectRef, options?: SignedUrlOptions): Promise<string>;
  putObject(input: R2UploadInput): Promise<R2ObjectRef>;
  deleteObject(ref: R2ObjectRef): Promise<void>;
}

export function buildTenantObjectKey(
  organizationId: string,
  category: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `org/${organizationId}/${category}/${safeName}`;
}

/** Scaffold adapter — wire to @aws-sdk/client-s3 in production. */
export class StubR2StorageAdapter implements R2StorageAdapter {
  buildKey(input: Pick<R2UploadInput, "organizationId" | "category" | "fileName">): string {
    return buildTenantObjectKey(input.organizationId, input.category, input.fileName);
  }

  async getSignedDownloadUrl(ref: R2ObjectRef, options?: SignedUrlOptions): Promise<string> {
    const ttl = options?.expiresInSeconds ?? 300;
    return `https://stub.r2.local/${ref.bucket}/${ref.key}?expires=${ttl}`;
  }

  async putObject(input: R2UploadInput): Promise<R2ObjectRef> {
    const bucket = process.env.R2_BUCKET ?? "hrms-private";
    return { bucket, key: this.buildKey(input) };
  }

  async deleteObject(_ref: R2ObjectRef): Promise<void> {
    // no-op stub
  }
}
