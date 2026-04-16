import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import type { Role, UserAuthEventView } from "@vm/shared";
import { Roles, RolesGuard } from "../common/http";
import { JwtAccessGuard } from "../auth/jwt-access.guard";
import { UsersService } from "./users.service";

const ROLE_VALUES = {
  student: "student",
  teacher: "teacher",
  admin: "admin"
} as const;

const AUTH_EVENT_TYPE_VALUES = {
  login: "login",
  refresh: "refresh",
  logout: "logout",
  login_failed: "login_failed"
} as const;

const AUTH_EVENT_STATUS_VALUES = {
  success: "success",
  failed: "failed"
} as const;

class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ROLE_VALUES)
  role?: Role;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateUserDto {
  @IsString()
  @MinLength(3)
  login!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEnum(ROLE_VALUES)
  role!: Role;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class ListAuthEventsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(AUTH_EVENT_TYPE_VALUES)
  eventType?: UserAuthEventView["eventType"];

  @IsOptional()
  @IsEnum(AUTH_EVENT_STATUS_VALUES)
  status?: UserAuthEventView["status"];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  login?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEnum(ROLE_VALUES)
  role?: Role;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags("admin-users")
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles("admin")
@Controller("api/v1/admin/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List users with filters" })
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get("auth-events")
  @ApiOperation({ summary: "List user authentication events" })
  async listAuthEvents(@Query() query: ListAuthEventsQueryDto) {
    return this.usersService.listAuthEvents(query);
  }

  @Post()
  @ApiOperation({ summary: "Create a new user" })
  @ApiBody({ type: CreateUserDto })
  async createUser(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update user role/profile/activity" })
  @ApiBody({ type: UpdateUserDto })
  async updateUser(@Param("id") userId: string, @Body() body: UpdateUserDto) {
    return this.usersService.updateUser(userId, body);
  }
}
