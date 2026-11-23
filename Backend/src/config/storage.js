import {
  S3Client,
  HeadBucketCommand
} from "@aws-sdk/client-s3";

import env from "./env.js";

const storageConfigured = Boolean(
  env.B2_ENDPOINT &&
  env.B2_BUCKET_NAME &&
  env.B2_KEY_ID &&
  env.B2_APPLICATION_KEY
);

export const storageClient = storageConfigured
  ? new S3Client({
      endpoint: env.B2_ENDPOINT,
      region: env.B2_REGION,
      credentials: {
        accessKeyId: env.B2_KEY_ID,
        secretAccessKey: env.B2_APPLICATION_KEY
      },
      forcePathStyle: true
    })
  : null;

export const STORAGE_BUCKET = env.B2_BUCKET_NAME;

export async function verifyStorageConnection() {
  if (!storageClient) {
    throw new Error("Backblaze B2 is not configured.");
  }

  await storageClient.send(
    new HeadBucketCommand({
      Bucket: STORAGE_BUCKET
    })
  );

  return true;
}