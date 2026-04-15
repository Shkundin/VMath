import {
  Body,
  Controller,
  Get,
  Header,
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
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser } from "../common/http";
import type { AuthenticatedUser } from "../common/http";
import { JwtAccessGuard } from "../auth/jwt-access.guard";
import { SessionsService } from "./sessions.service";

class CreateSessionDto {
  @IsString()
  lectureId!: string;
}

class JoinSessionDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  sessionCode?: string;
}

class SetCurrentBlockDto {
  @IsString()
  blockId!: string;
}

class StartCheckingBlockDto {
  @IsOptional()
  @IsInt()
  timeLimitSec?: number;
}

class AnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsArray()
  selectedOptionIds?: string[];

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsString()
  formulaAnswer?: string;

  @IsOptional()
  @IsBoolean()
  isRefused?: boolean;
}

class SubmitAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];

  @IsOptional()
  @IsBoolean()
  finalize?: boolean;
}

class VisualStateDto {
  @IsString()
  blockId!: string;

  @IsInt()
  schemaVersion!: number;

  @IsObject()
  state!: Record<string, unknown>;
}

@ApiTags("sessions")
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller("api/v1/sessions")
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get("active")
  @ApiOperation({ summary: "List active sessions" })
  async listActiveSessions(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.sessionsService.listActiveSessions(currentUser);
  }

  @Post()
  @ApiOperation({ summary: "Create lesson session draft" })
  @ApiBody({ type: CreateSessionDto })
  async createSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateSessionDto
  ) {
    return this.sessionsService.createSession(currentUser, body.lectureId);
  }

  @Post(":id/start")
  @ApiOperation({ summary: "Start lesson session" })
  async startSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string
  ) {
    return this.sessionsService.startSession(currentUser, sessionId);
  }

  @Post(":id/stop")
  @ApiOperation({ summary: "Stop lesson session" })
  async stopSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string
  ) {
    return this.sessionsService.stopSession(currentUser, sessionId);
  }

  @Post("join")
  @ApiOperation({ summary: "Join active session by id or session code" })
  @ApiBody({ type: JoinSessionDto })
  async joinSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: JoinSessionDto
  ) {
    return this.sessionsService.joinSession(currentUser, body);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get session state" })
  async getSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string
  ) {
    return this.sessionsService.getSession(currentUser, sessionId);
  }

  @Patch(":id/current-block")
  @ApiOperation({ summary: "Switch current lecture block" })
  @ApiBody({ type: SetCurrentBlockDto })
  async setCurrentBlock(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string,
    @Body() body: SetCurrentBlockDto
  ) {
    return this.sessionsService.setCurrentBlock(currentUser, sessionId, body.blockId);
  }

  @Get(":id/participants")
  @ApiOperation({ summary: "List current session participants" })
  async getParticipants(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string
  ) {
    return this.sessionsService.listParticipants(currentUser, sessionId);
  }

  @Patch(":id/visual-state")
  @ApiOperation({ summary: "Persist current visual module state" })
  @ApiBody({ type: VisualStateDto })
  async updateVisualState(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string,
    @Body() body: VisualStateDto
  ) {
    return this.sessionsService.updateVisualState(
      currentUser,
      sessionId,
      body.blockId,
      body.schemaVersion,
      body.state
    );
  }

  @Post(":id/blocks/:blockId/checking/start")
  @ApiOperation({ summary: "Start checking block for the current session" })
  @ApiBody({ type: StartCheckingBlockDto })
  async startCheckingBlock(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string,
    @Param("blockId") blockId: string,
    @Body() body: StartCheckingBlockDto
  ) {
    return this.sessionsService.startCheckingBlock(
      currentUser,
      sessionId,
      blockId,
      body.timeLimitSec
    );
  }

  @Post(":id/blocks/:blockId/checking/finish")
  @ApiOperation({ summary: "Finish checking block and publish results" })
  async finishCheckingBlock(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string,
    @Param("blockId") blockId: string
  ) {
    return this.sessionsService.finishCheckingBlock(currentUser, sessionId, blockId);
  }

  @Post(":id/blocks/:blockId/answers")
  @ApiOperation({ summary: "Submit or update answers for current student" })
  @ApiBody({ type: SubmitAnswersDto })
  async submitAnswers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string,
    @Param("blockId") blockId: string,
    @Body() body: SubmitAnswersDto
  ) {
    return this.sessionsService.submitAnswers(
      currentUser,
      sessionId,
      blockId,
      body.answers,
      body.finalize ?? false
    );
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "Get teacher statistics for the session" })
  async getStats(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string
  ) {
    return this.sessionsService.getStats(currentUser, sessionId);
  }

  @Get(":id/results")
  @ApiOperation({ summary: "Get published results for session participants" })
  async getResults(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string
  ) {
    return this.sessionsService.getResults(currentUser, sessionId);
  }

  @Get(":id/results/export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @ApiOperation({ summary: "Export results as CSV" })
  async exportResults(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string
  ) {
    return this.sessionsService.exportResults(currentUser, sessionId);
  }
}

@ApiTags("sessions")
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller()
export class LegacySessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post("sessions")
  async createSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateSessionDto
  ) {
    return this.sessionsService.createSession(currentUser, body.lectureId);
  }

  @Get("sessions/active")
  async listActiveSessions(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.sessionsService.listActiveSessions(currentUser);
  }

  @Get("sessions/:id")
  async getSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string
  ) {
    return this.sessionsService.getSession(currentUser, sessionId);
  }

  @Post("sessions/join")
  async joinSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: JoinSessionDto
  ) {
    return this.sessionsService.joinSession(currentUser, body);
  }

  @Post("sessions/:id/activeBlock")
  async setCurrentBlock(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") sessionId: string,
    @Body() body: SetCurrentBlockDto
  ) {
    return this.sessionsService.setCurrentBlock(currentUser, sessionId, body.blockId);
  }

  @Post("quiz/submit")
  async submitQuiz(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body()
    body: {
      sessionId: string;
      blockId: string;
      answers: AnswerDto[];
    }
  ) {
    return this.sessionsService.submitAnswers(
      currentUser,
      body.sessionId,
      body.blockId,
      body.answers,
      true
    );
  }
}
