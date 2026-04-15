import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";
import { CurrentUser, RateLimit, RateLimitGuard } from "../common/http";
import type { AuthenticatedUser } from "../common/http";
import { AuthService } from "./auth.service";
import { JwtAccessGuard } from "./jwt-access.guard";

class LoginDto {
  @IsString()
  @MinLength(3)
  login!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsBoolean()
  allSessions?: boolean;
}

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Login with login/password and receive access/refresh tokens" })
  @ApiBody({ type: LoginDto })
  @UseGuards(RateLimitGuard)
  @RateLimit(8, 60_000)
  async login(
    @Body() body: LoginDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.login({
      login: body.login,
      password: body.password,
      ipAddress,
      userAgent
    });
  }

  @Post("refresh")
  @ApiOperation({ summary: "Rotate refresh token and receive a new token pair" })
  @ApiBody({ type: RefreshDto })
  @UseGuards(RateLimitGuard)
  @RateLimit(12, 60_000)
  async refresh(
    @Body() body: RefreshDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.refresh(body.refreshToken, { ipAddress, userAgent });
  }

  @Post("logout")
  @HttpCode(200)
  @ApiOperation({ summary: "Invalidate refresh token or all user sessions" })
  @ApiBody({ type: LogoutDto })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  async logout(
    @Body() body: LogoutDto,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    return this.authService.logout({
      currentUser,
      refreshToken: body.refreshToken,
      allSessions: body.allSessions
    });
  }

  @Get("me")
  @ApiOperation({ summary: "Return current authenticated user profile" })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.getProfile(currentUser);
  }
}

@ApiTags("auth")
@Controller("auth")
export class LegacyAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @UseGuards(RateLimitGuard)
  @RateLimit(8, 60_000)
  async login(
    @Body() body: LoginDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.login({
      login: body.login,
      password: body.password,
      ipAddress,
      userAgent
    });
  }

  @Post("refresh")
  @UseGuards(RateLimitGuard)
  @RateLimit(12, 60_000)
  async refresh(
    @Body() body: RefreshDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.refresh(body.refreshToken, { ipAddress, userAgent });
  }
}
