import { HUserDocument } from "../../DB/models/user.model";
import redisService from "../commen/services/redis.service";
import { ITokenPayload } from "../commen/services/token.service";

const REFRESH_EXPIRES = 7 * 24 * 60 * 60;

class UserService {
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
}

export default new UserService();