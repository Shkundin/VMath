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
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import type { Role } from "@vm/shared";
import { Roles, RolesGuard } from "../common/http";
import { JwtAccessGuard } from "../auth/jwt-access.guard";
import { UsersService } from "./users.service";

const ROLE_VALUES = {
  student: "student",
  teacher: "teacher",
  admin: "admin"
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
