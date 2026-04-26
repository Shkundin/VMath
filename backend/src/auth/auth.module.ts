import { Global, Module } from "@nestjs/common";
import { AuthController, LegacyAuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleIdentityService } from "./google-identity.service";
import { JwtAccessGuard } from "./jwt-access.guard";
import { JwtTokenService } from "./jwt-token.service";
import { PasswordService } from "./password.service";
import { VkIdentityService } from "./vk-identity.service";

@Global()
@Module({
  controllers: [AuthController, LegacyAuthController],
  providers: [
    AuthService,
    JwtAccessGuard,
    JwtTokenService,
    PasswordService,
    GoogleIdentityService,
    VkIdentityService
  ],
  exports: [AuthService, JwtAccessGuard, JwtTokenService, PasswordService]
})
export class AuthModule {}
