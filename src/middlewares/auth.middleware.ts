import { NextFunction, Request, Response } from "express";
import {
  ForbiddenException,
  UnauthorizedException,
} from "../modules/commen/response";
import tokenService, {
  ITokenPayload,
} from "../modules/commen/services/token.service";
import redisService from "../modules/commen/services/redis.service";
import { UserRepository } from "../DB/repo/user.repository";
import { HUserDocument } from "../DB/models/user.model";
import { Role } from "../modules/commen/enums";

declare global {
  namespace Express {
    interface Request {
      user?: HUserDocument;
      decoded?: ITokenPayload;
    }
  }
}

const userRepo = new UserRepository();

export const authentication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [scheme, token] = req.headers.authorization?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("missing or invalid authorization header");
    }

    const decoded = tokenService.verify(token);

    const revoked = await redisService.exists(
      redisService.revokeTokenKey(decoded.sub, decoded.jti),
    );
    if (revoked) {
      throw new UnauthorizedException("token revoked");
    }

    const user = await userRepo.findOne({ filter: { _id: decoded.sub } });
    if (!user) {
      throw new UnauthorizedException("user not found");
    }

    if (
      user.changeCredentialsTime &&
      decoded.iat! * 1000 < user.changeCredentialsTime.getTime()
    ) {
      throw new UnauthorizedException("please login again");
    }

    req.user = user;
    req.decoded = decoded;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const authorization = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenException("not allowed to access this route"));
    }
    return next();
  };
};