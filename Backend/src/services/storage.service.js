import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import crypto from "node:crypto";
import path from "node:path";

import {
  storageClient,
  STORAGE_BUCKET
} from "../config/storage.js";

import env from "../config/env.js";

function ensureStorageConfigured() {
  if (!storageClient) {
    throw new Error("Backblaze B2 is not configured.");
  }
}

export async function uploadPdf(file) {
  ensureStorageConfigured();

  const checksum = crypto
    .createHash("sha256")
    .update(file.buffer)
    .digest("hex");

  const storageKey = [
    "resources",
    new Date().getUTCFullYear(),
    crypto.randomUUID() + ".pdf"
  ].join("/");

  await storageClient.send(
    new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: storageKey,
      Body: file.buffer,
      ContentLength: file.size,
      ContentType: "application/pdf",
      Metadata: {
        sha256: checksum
      }
    })
  );

  return {
    partNumber: 1,
    originalFileName: path.basename(file.originalname).slice(0, 255),
    storageKey,
    contentType: "application/pdf",
    sizeBytes: file.size,
    checksum
  };
}

export async function uploadPdfParts(files) {
  const uploadedParts = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const part = await uploadPdf(files[index]);

      uploadedParts.push({
        ...part,
        partNumber: index + 1
      });
    }

    return uploadedParts;
  } catch (error) {
    await Promise.allSettled(
      uploadedParts.map((part) => deleteStoredFile(part.storageKey))
    );

    throw error;
  }
}

export async function deleteStoredFile(storageKey) {
  if (!storageKey) return;

  ensureStorageConfigured();

  await storageClient.send(
    new DeleteObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: storageKey
    })
  );
}

export async function deleteStoredFiles(parts = []) {
  return Promise.allSettled(
    parts.map((part) => deleteStoredFile(part.storageKey))
  );
}

export async function createDownloadUrl(storageKey) {
  ensureStorageConfigured();

  if (
    typeof storageKey !== "string" ||
    !storageKey.startsWith("resources/")
  ) {
    throw new Error("Invalid storage key.");
  }

  const command = new GetObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: storageKey
  });

  return getSignedUrl(storageClient, command, {
    expiresIn: env.SIGNED_URL_EXPIRY_SECONDS
  });
}