import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { BadRequestException } from "../response";
import { config } from "dotenv";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "node:fs";
import { unlink } from "node:fs/promises";
config();

class S3Service {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.AWS_BUCKET_NAME as string;
    this.client = new S3Client({
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
  }

  async uploadFile({
    file,
    folder = "general",
  }: {
    file: Express.Multer.File;
    folder?: string;
  }) {
    const key = `${folder}/${randomUUID()}-${file.originalname}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (error) {
      throw new BadRequestException("failed to upload file", error);
    }

    return key;
  }

  async deleteFile(key: string) {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      throw new BadRequestException("failed to delete file", error);
    }
  }

  async getPresignedUrl({
    key,
    expiresIn = 60 * 5,
    downloadName,
  }: {
    key: string;
    expiresIn?: number;
    downloadName?: string;
  }) {
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ...(downloadName && {
            ResponseContentDisposition: `attachment; filename="${downloadName}"`,
          }),
        }),
        { expiresIn },
      );
    } catch (error) {
      throw new BadRequestException("failed to create url", error);
    }
  }

  async getFile(key: string) {
    try {
      return await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      throw new BadRequestException("failed to get file", error);
    }
  }

    async uploadLargeFile({
    file,
    folder = "general",
  }: {
    file: Express.Multer.File;
    folder?: string;
  }) {
    const key = `${folder}/${randomUUID()}-${file.originalname}`;

    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: createReadStream(file.path),
          ContentType: file.mimetype,
        },
        partSize: 5 * 1024 * 1024,
        queueSize: 4,
      });

      upload.on("httpUploadProgress", (p) => {
        console.log(`uploaded ${p.loaded} / ${p.total ?? "?"}`);
      });

      await upload.done();
    } catch (error) {
      throw new BadRequestException("failed to upload large file", error);
    } finally {
      await unlink(file.path).catch(() => null);
    }

    return key;
  }

  async getPresignedUploadUrl({
    folder = "general",
    fileName,
    contentType,
    expiresIn = 60 * 5,
  }: {
    folder?: string;
    fileName: string;
    contentType: string;
    expiresIn?: number;
  }) {
    const key = `${folder}/${randomUUID()}-${fileName}`;
    try {
      const url = await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn },
      );
      return { url, key };
    } catch (error) {
      throw new BadRequestException("failed to create upload url", error);
    }
  }

  async deleteFiles(keys: string[]) {
    try {
      return await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
            Quiet: false,
          },
        }),
      );
    } catch (error) {
      throw new BadRequestException("failed to delete files", error);
    }
  }

}

export default new S3Service();