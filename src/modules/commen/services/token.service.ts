import jwt, { JwtPayload } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { HUserDocument } from "../../../DB/models/user.model";
import { UnauthorizedException } from "../response";
import { Role } from "../enums";

export interface ITokenPayload extends JwtPayload {
  sub: string;
  role: Role;
  jti: string;
}

export enum TokenType {
  access = "access",
  refresh = "refresh",
}

const ACCESS_EXPIRES = 15 * 60;
const REFRESH_EXPIRES = 7 * 24 * 60 * 60;

class TokenService {
  private secret(type: TokenType) {
    const s =
      type === TokenType.access
        ? process.env.ACCESS_TOKEN_SECRET
        : process.env.REFRESH_TOKEN_SECRET;
    if (!s) throw new Error(`missing ${type} token secret`);
    return s;
  }

  generateTokens(user: HUserDocument) {
    const jti = randomUUID();
    const payload = { role: user.role };
    const base = { subject: user._id.toString(), jwtid: jti };

    const accessToken = jwt.sign(payload, this.secret(TokenType.access), {
      ...base,
      expiresIn: ACCESS_EXPIRES,
    });
    const refreshToken = jwt.sign(payload, this.secret(TokenType.refresh), {
      ...base,
      expiresIn: REFRESH_EXPIRES,
    });

    return { accessToken, refreshToken };
  }

  verify(token: string, type: TokenType = TokenType.access) {
    try {
      return jwt.verify(token, this.secret(type)) as ITokenPayload;
    } catch {
      throw new UnauthorizedException("invalid or expired token");
    }
  }
}

export default new TokenService();