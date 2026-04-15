import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AppException, type RequestWithUser } from "../common/http";
import { JwtTokenService } from "./jwt-token.service";

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const headerValue = request.headers.authorization;
    const token = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!token?.startsWith("Bearer ")) {
      throw new AppException("AUTH", 401, "Missing bearer token");
    }

    request.currentUser = this.jwtTokenService.verifyAccessToken(token.slice("Bearer ".length));
    return true;
  }
}
