import {
  BadRequestException,
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
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength
} from "class-validator";
import type { LectureBlock, LectureLevel, Role } from "@vm/shared";
import { CurrentUser } from "../common/http";
import type { AuthenticatedUser } from "../common/http";
import { JwtAccessGuard } from "../auth/jwt-access.guard";
import { LecturesService } from "./lectures.service";

class LectureQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  subjectCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  semester?: number;

  @IsOptional()
  @IsString()
  level?: LectureLevel;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}

class LectureBlockInputDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  type?: LectureBlock["type"];

  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

class UpsertLectureDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  semester?: number;

  @IsOptional()
  @IsString()
  level?: LectureLevel;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  status?: "draft" | "published" | "archived";

  @IsOptional()
  @IsArray()
  availableForRoles?: Role[];

  @IsOptional()
  @IsArray()
  blocks!: LectureBlockInputDto[];
}

@ApiTags("lectures")
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller("api/v1/lectures")
export class LecturesController {
  constructor(private readonly lecturesService: LecturesService) {}

  @Get()
  @ApiOperation({ summary: "List lectures available to current user" })
  async listLectures(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: LectureQueryDto
  ) {
    return this.lecturesService.listLectures(currentUser, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get lecture details" })
  async getLecture(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") lectureId: string
  ) {
    return this.lecturesService.getLecture(currentUser, lectureId);
  }

  @Get(":id/blocks")
  @ApiOperation({ summary: "Get lecture blocks only" })
  async getBlocks(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") lectureId: string
  ) {
    return this.lecturesService.getLectureBlocks(currentUser, lectureId);
  }

  @Post()
  @ApiOperation({ summary: "Create lecture from blocks and modules" })
  @ApiBody({ type: UpsertLectureDto })
  async createLecture(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: UpsertLectureDto
  ) {
    if (!body.title) {
      throw new BadRequestException("title is required");
    }

    return this.lecturesService.createLecture(currentUser, {
      title: body.title,
      description: body.description,
      subjectId: body.subjectId,
      semester: body.semester,
      level: body.level,
      tags: body.tags,
      status: body.status,
      availableForRoles: body.availableForRoles,
      blocks: body.blocks ?? []
    });
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update lecture metadata or blocks" })
  @ApiBody({ type: UpsertLectureDto })
  async updateLecture(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") lectureId: string,
    @Body() body: UpsertLectureDto
  ) {
    return this.lecturesService.updateLecture(currentUser, lectureId, {
      title: body.title,
      description: body.description,
      subjectId: body.subjectId,
      semester: body.semester,
      level: body.level,
      tags: body.tags,
      status: body.status,
      availableForRoles: body.availableForRoles,
      blocks: body.blocks
    });
  }
}

@ApiTags("lectures")
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller("lectures")
export class LegacyLecturesController {
  constructor(private readonly lecturesService: LecturesService) {}

  @Get()
  async listLectures(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: LectureQueryDto
  ) {
    return this.lecturesService.listLectures(currentUser, query);
  }

  @Get(":id")
  async getLecture(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") lectureId: string
  ) {
    return this.lecturesService.getLecture(currentUser, lectureId);
  }
}
