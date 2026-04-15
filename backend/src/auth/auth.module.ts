import { Global, Module } from "@nestjs/common";
import { AuthController, LegacyAuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAccessGuard } from "./jwt-access.guard";
import { JwtTokenService } from "./jwt-token.service";
import { PasswordService } from "./password.service";

@Global()
@Module({
  controllers: [AuthController, LegacyAuthController],
  providers: [AuthService, JwtAccessGuard, JwtTokenService, PasswordService],
  exports: [AuthService, JwtAccessGuard, JwtTokenService, PasswordService]
})
export class AuthModule {}
