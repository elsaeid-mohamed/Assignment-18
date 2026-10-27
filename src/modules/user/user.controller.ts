import { NextFunction, Request, Response, Router } from "express";
import { successResponse } from "../commen/response";
import userService from "./user.service";
import {
  authentication,
  authorization,
} from "../../middlewares/auth.middleware";
import { Role } from "../commen/enums";

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

export default userRouter;