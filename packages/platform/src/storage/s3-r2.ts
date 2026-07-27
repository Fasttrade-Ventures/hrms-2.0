import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  buildTenantObjectKey,
  type R2ObjectRef,
  type R2StorageAdapter,
  type R2UploadInput,
  type SignedUrlOptions,
} from "./r2";

export class S3R2StorageAdapter implements R2StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint =
      process.env.R2_ENDPOINT ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
    this.bucket = process.env.R2_BUCKET ?? "hrms-private";

    if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
      throw new Error(
        "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
      );
    }

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  buildKey(input: Pick<R2UploadInput, "organizationId" | "category" | "fileName">): string {
    return buildTenantObjectKey(input.organizationId, input.category, input.fileName);
  }

  async putObject(input: R2UploadInput): Promise<R2ObjectRef> {
    const key = this.buildKey(input);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return { bucket: this.bucket, key };
  }

  async getSignedDownloadUrl(ref: R2ObjectRef, options?: SignedUrlOptions): Promise<string> {
    const command = new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key });
    return getSignedUrl(this.client, command, {
      expiresIn: options?.expiresInSeconds ?? 300,
    });
  }

  async deleteObject(ref: R2ObjectRef): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
  }
}
