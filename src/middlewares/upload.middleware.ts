import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { tmpdir } from "node:os";
import { BadRequestException } from "../modules/commen/response";

export const fileValidation = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4"],
  pdf: ["application/pdf"],
};

export enum StorageType {
  memory = "memory",
  disk = "disk",
}

export const uploadFile = ({
  validation = fileValidation.image,
  maxSizeMB = 5,
  storageType = StorageType.memory,
}: {
  validation?: string[];
  maxSizeMB?: number;
  storageType?: StorageType;
} = {}) => {
  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    if (!validation.includes(file.mimetype)) {
      return cb(new BadRequestException("invalid file type"));
    }
    return cb(null, true);
  };

  const storage =
    storageType === StorageType.disk
      ? multer.diskStorage({ destination: tmpdir() })
      : multer.memoryStorage();

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
  });
};