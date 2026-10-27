import { UserRepository } from "../../DB/repo/user.repository";
import {
  ConflictException,
  UnauthorizedException,
} from "../commen/response";
import { compareHash } from "../commen/utils/hash";
import { ILogin, ISignUp } from "./dto/auth.dto";
import tokenService from "../commen/services/token.service";

class AuthService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async login(data: ILogin) {
    const { email, password } = data;

    const user = await this.userRepo.findOne({ filter: { email } });

    if (!user) {
      throw new UnauthorizedException("invalid email or password");
    }

    const isMatch = await compareHash(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException("invalid email or password");
    }

    const { accessToken, refreshToken } = tokenService.generateTokens(user);
    const { password: _pw, ...safeUser } = user.toJSON();

    return { user: safeUser, accessToken, refreshToken };
  }

  async signUp(data: ISignUp) {
    const { email, password, confirmPassword, ...userData } = data;

    const existUser = await this.userRepo.findOne({ filter: { email } });

    if (existUser) {
      throw new ConflictException("email already exists");
    }

    const user = await this.userRepo.createOne({
      data: { email, password, ...userData },
    });

    const { password: _pw, ...safeUser } = user.toJSON();

    return { user: safeUser };
  }
}

const authService = new AuthService();

export default authService;