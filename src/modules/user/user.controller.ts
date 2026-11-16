import { NextFunction, Request, Response, Router } from "express";
import { BadRequestException, successResponse } from "../commen/response";
import userService from "./user.service";
import {
  authentication,
  authorization,
} from "../../middlewares/auth.middleware";
import { Role } from "../commen/enums";
import {
  StorageType,
  fileValidation,
  uploadFile,
} from "../../middlewares/upload.middleware";
import s3Service from "../commen/services/s3.service";

const userRouter = Router();

userRouter.get(
  "/profile",
  authentication,
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.profile(req.user!);
    return successResponse({ res, data });
  },
);

userRouter.get(
  "/admin-only",
  authentication,
  authorization([Role.admin]),
  (req: Request, res: Response) => {
    return successResponse({ res, data: { message: "welcome admin" } });
  },
);

userRouter.post(
  "/logout",
  authentication,
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await userService.logout(req.decoded!);
    return successResponse({ res, message: "logout successfully", data });
  },
);

userRouter.patch(
  "/profile-image",
  authentication,
  uploadFile().single("image"),
  async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestException("image is required");
    const data = await userService.updateProfileImage(req.user!, req.file);
    return successResponse({ res, message: "profile image updated", data });
  },
);

userRouter.get(
  "/profile-image",
  authentication,
  async (req: Request, res: Response) => {
    const data = await userService.getProfileImageUrl(req.user!);
    return successResponse({ res, data });
  },
);

userRouter.post(
  "/upload-video",
  authentication,
  uploadFile({
    validation: fileValidation.video,
    maxSizeMB: 200,
    storageType: StorageType.disk,
  }).single("video"),
  async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestException("video is required");
    const key = await s3Service.uploadLargeFile({
      file: req.file,
      folder: `users/${req.user!._id}/videos`,
    });
    return successResponse({ res, status: 201, data: { key } });
  },
);

userRouter.post(
  "/presigned-upload",
  authentication,
  async (req: Request, res: Response) => {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      throw new BadRequestException("fileName and contentType are required");
    }
    const data = await s3Service.getPresignedUploadUrl({
      folder: `users/${req.user!._id}`,
      fileName,
      contentType,
    });
    return successResponse({ res, data });
  },
);

userRouter.delete(
  "/files",
  authentication,
  async (req: Request, res: Response) => {
    const { keys } = req.body;
    if (
      !Array.isArray(keys) ||
      !keys.length ||
      keys.some((k) => typeof k !== "string")
    ) {
      throw new BadRequestException("keys must be a non-empty array of strings");
    }
    const data = await userService.deleteFiles(req.user!, keys);
    return successResponse({ res, message: "files deleted", data });
  },
);

export default userRouter;