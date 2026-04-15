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
import { IsObject, IsOptional, IsString, MinLength } from "class-validator";
import type { AssetMetadata, ModuleType } from "@vm/shared";
import { CurrentUser } from "../common/http";
import type { AuthenticatedUser } from "../common/http";
import { JwtAccessGuard } from "../auth/jwt-access.guard";
import { ModulesService } from "./modules.service";

const MODULE_TYPE_VALUES = {
  text: "text",
  visual_module: "visual_module",
  questionnaire: "questionnaire",
  checking_block: "checking_block"
} as const;

class ListModulesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  moduleType?: ModuleType;
}

class UpsertModuleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  moduleType?: ModuleType;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsObject()
  illustration?: AssetMetadata | null;

  @IsOptional()
  @IsObject({ each: true })
  assetMetadata?: AssetMetadata[];

  @IsObject()
  content!: Record<string, unknown>;
}

@ApiTags("modules")
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller("api/v1/modules")
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  @ApiOperation({ summary: "List content modules" })
  async listModules(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListModulesQueryDto
  ) {
    return this.modulesService.listModules(currentUser, {
      q: query.q,
      moduleType:
        query.moduleType && query.moduleType in MODULE_TYPE_VALUES
          ? (query.moduleType as ModuleType)
          : undefined
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get module details" })
  async getModule(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") moduleId: string
  ) {
    return this.modulesService.getModule(currentUser, moduleId);
  }

  @Post()
  @ApiOperation({ summary: "Create content module" })
  @ApiBody({ type: UpsertModuleDto })
  async createModule(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: UpsertModuleDto
  ) {
    if (!body.title || !body.moduleType) {
      throw new BadRequestException("title and moduleType are required");
    }

    return this.modulesService.createModule(currentUser, {
      title: body.title,
      description: body.description,
      moduleType: body.moduleType,
      subjectId: body.subjectId,
      tags: body.tags,
      content: body.content,
      illustration: body.illustration,
      assetMetadata: body.assetMetadata
    });
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update content module" })
  @ApiBody({ type: UpsertModuleDto })
  async updateModule(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") moduleId: string,
    @Body() body: UpsertModuleDto
  ) {
    return this.modulesService.updateModule(currentUser, moduleId, {
      title: body.title,
      description: body.description,
      subjectId: body.subjectId,
      tags: body.tags,
      content: body.content,
      illustration: body.illustration,
      assetMetadata: body.assetMetadata
    });
  }
}
