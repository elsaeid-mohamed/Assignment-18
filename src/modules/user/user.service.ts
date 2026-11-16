import { HUserDocument } from "../../DB/models/user.model";
import { UserRepository } from "../../DB/repo/user.repository";
import redisService from "../commen/services/redis.service";
import s3Service from "../commen/services/s3.service";
import { ITokenPayload } from "../commen/services/token.service";
import { ForbiddenException, NotFoundException } from "../commen/response";

const REFRESH_EXPIRES = 7 * 24 * 60 * 60;

class UserService {
  private userRepo = new UserRepository();

  async profile(user: HUserDocument) {
    const { password, oldPasswords, ...safeUser } = user.toJSON();
    return { user: safeUser };
  }

  async logout(decoded: ITokenPayload) {
    await redisService.set({
      key: redisService.revokeTokenKey(decoded.sub, decoded.jti),
      val: true,
      ttl: REFRESH_EXPIRES,
    });
    return null;
  }

  async updateProfileImage(user: HUserDocument, file: Express.Multer.File) {
    const oldKey = user.profileImage;

    const key = await s3Service.uploadFile({
      file,
      folder: `users/${user._id}`,
    });

    user.profileImage = key;
    await user.save();

    if (oldKey) {
      await s3Service.deleteFile(oldKey).catch(() => null);
    }

    return { profileImage: key };
  }

    async getProfileImageUrl(user: HUserDocument) {
    if (!user.profileImage) {
      throw new NotFoundException("no profile image");
    }
    const url = await s3Service.getPresignedUrl({ key: user.profileImage });
    return { url, expiresInSeconds: 300 };
  }

    async deleteFiles(user: HUserDocument, keys: string[]) {
    const prefix = `users/${user._id}/`;

    if (!keys.every((key) => key.startsWith(prefix))) {
      throw new ForbiddenException("you can delete your own files only");
    }

    await s3Service.deleteFiles(keys);

    if (user.profileImage && keys.includes(user.profileImage)) {
      user.profileImage = undefined;
      await user.save();
    }

    return { deleted: keys.length };
  }

}

export default new UserService();