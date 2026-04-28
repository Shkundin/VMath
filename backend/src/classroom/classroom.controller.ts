import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import type { ClassroomResourceKind, ClassroomTestingAnswerKey } from "@vm/shared";
import { JwtAccessGuard } from "../auth/jwt-access.guard";
import { CurrentUser } from "../common/http";
import type { AuthenticatedUser } from "../common/http";
import { ClassroomService } from "./classroom.service";

class CreateMeetingDto {
  @IsString()
  title!: string;

  @IsString()
  platform!: string;

  @IsString()
  url!: string;

  @IsString()
  scheduledAt!: string;

  @IsInt()
  @Min(1)
  durationMin!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

class CreateHomeworkDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  dueAt!: string;

  @IsArray()
  allowedFormats!: string[];

  @IsInt()
  @Min(1)
  maxScore!: number;
}

class CreateHomeworkSubmissionDto {
  @IsString()
  fileName!: string;

  @IsString()
  fileType!: string;

  @IsString()
  fileData!: string;
}

class CreateResourceDto {
  @IsString()
  @IsIn(["video", "photo"])
  kind!: ClassroomResourceKind;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  fileType?: string;

  @IsOptional()
  @IsString()
  fileData?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

class GradeHomeworkSubmissionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  score!: number | null;

  @IsString()
  comment!: string;
}

class TestingOptionDto {
  @IsString()
  key!: ClassroomTestingAnswerKey;

  @IsString()
  text!: string;
}

class TestingQuestionDto {
  @IsString()
  id!: string;

  @IsString()
  text!: string;

  @IsArray()
  options!: TestingOptionDto[];

  @IsString()
  correctAnswerKey!: ClassroomTestingAnswerKey;

  @IsOptional()
  @IsString()
  explanation?: string;
}

class StartTestingSessionDto {
  @IsString()
  title!: string;

  @IsInt()
  @Min(1)
  @Max(180)
  durationMin!: number;

  @IsArray()
  questions!: TestingQuestionDto[];
}

class SubmitTestingAnswersDto {
  @IsObject()
  answers!: Record<string, ClassroomTestingAnswerKey>;
}

@ApiTags("classroom")
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller("api/v1/classroom")
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Get("branches")
  @ApiOperation({ summary: "List available teacher branches" })
  async listBranches() {
    return this.classroomService.listTeacherBranches();
  }

  @Get("teachers/:teacherLogin/meetings")
  @ApiOperation({ summary: "List meetings for a teacher branch" })
  async listMeetings(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("teacherLogin") teacherLogin: string
  ) {
    return this.classroomService.listMeetings(currentUser, teacherLogin);
  }

  @Post("meetings")
  @ApiOperation({ summary: "Create a teacher meeting" })
  @ApiBody({ type: CreateMeetingDto })
  async createMeeting(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateMeetingDto
  ) {
    return this.classroomService.createMeeting(currentUser, body);
  }

  @Delete("meetings/:meetingId")
  @ApiOperation({ summary: "Delete a teacher meeting" })
  async deleteMeeting(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("meetingId") meetingId: string
  ) {
    return this.classroomService.deleteMeeting(currentUser, meetingId);
  }

  @Get("teachers/:teacherLogin/homeworks")
  @ApiOperation({ summary: "List homeworks for a teacher branch" })
  async listHomeworks(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("teacherLogin") teacherLogin: string
  ) {
    return this.classroomService.listHomeworks(currentUser, teacherLogin);
  }

  @Post("homeworks")
  @ApiOperation({ summary: "Create homework for the current teacher" })
  @ApiBody({ type: CreateHomeworkDto })
  async createHomework(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateHomeworkDto
  ) {
    return this.classroomService.createHomework(currentUser, body);
  }

  @Delete("homeworks/:homeworkId")
  @ApiOperation({ summary: "Delete homework for the current teacher" })
  async deleteHomework(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("homeworkId") homeworkId: string
  ) {
    return this.classroomService.deleteHomework(currentUser, homeworkId);
  }

  @Get("teachers/:teacherLogin/resources")
  @ApiOperation({ summary: "List teacher shared video and photo resources" })
  async listResources(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("teacherLogin") teacherLogin: string,
    @Query("kind") kind?: ClassroomResourceKind
  ) {
    return this.classroomService.listResources(currentUser, teacherLogin, kind);
  }

  @Post("resources")
  @ApiOperation({ summary: "Create a teacher shared resource" })
  @ApiBody({ type: CreateResourceDto })
  async createResource(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateResourceDto
  ) {
    return this.classroomService.createResource(currentUser, body);
  }

  @Delete("resources/:resourceId")
  @ApiOperation({ summary: "Delete teacher shared resource" })
  async deleteResource(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("resourceId") resourceId: string
  ) {
    return this.classroomService.deleteResource(currentUser, resourceId);
  }

  @Get("teachers/:teacherLogin/homework-submissions")
  @ApiOperation({ summary: "List homework submissions for a teacher branch" })
  async listHomeworkSubmissions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("teacherLogin") teacherLogin: string
  ) {
    return this.classroomService.listHomeworkSubmissions(currentUser, teacherLogin);
  }

  @Post("homeworks/:homeworkId/submissions")
  @ApiOperation({ summary: "Create or replace student homework submission" })
  @ApiBody({ type: CreateHomeworkSubmissionDto })
  async createHomeworkSubmission(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("homeworkId") homeworkId: string,
    @Body() body: CreateHomeworkSubmissionDto
  ) {
    return this.classroomService.upsertHomeworkSubmission(currentUser, homeworkId, body);
  }

  @Delete("homework-submissions/:submissionId")
  @ApiOperation({ summary: "Delete homework submission" })
  async deleteHomeworkSubmission(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("submissionId") submissionId: string
  ) {
    return this.classroomService.deleteHomeworkSubmission(currentUser, submissionId);
  }

  @Post("homework-submissions/:submissionId/grade")
  @ApiOperation({ summary: "Grade homework submission" })
  @ApiBody({ type: GradeHomeworkSubmissionDto })
  async gradeHomeworkSubmission(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("submissionId") submissionId: string,
    @Body() body: GradeHomeworkSubmissionDto
  ) {
    return this.classroomService.gradeHomeworkSubmission(currentUser, submissionId, body);
  }

  @Get("teachers/:teacherLogin/testing/active")
  @ApiOperation({ summary: "Get active teacher testing session" })
  async getActiveTestingSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("teacherLogin") teacherLogin: string
  ) {
    return this.classroomService.getActiveTestingSession(currentUser, teacherLogin);
  }

  @Get("testing/sessions/:sessionId/submissions")
  @ApiOperation({ summary: "List submissions for a testing session" })
  async listTestingSubmissions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("sessionId") sessionId: string
  ) {
    return this.classroomService.listTestingSubmissions(currentUser, sessionId);
  }

  @Post("testing/sessions")
  @ApiOperation({ summary: "Start a teacher testing session" })
  @ApiBody({ type: StartTestingSessionDto })
  async startTestingSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: StartTestingSessionDto
  ) {
    return this.classroomService.startTestingSession(currentUser, body);
  }

  @Post("testing/sessions/:sessionId/finish")
  @ApiOperation({ summary: "Finish a teacher testing session" })
  async finishTestingSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("sessionId") sessionId: string
  ) {
    return this.classroomService.finishTestingSession(currentUser, sessionId);
  }

  @Post("testing/sessions/:sessionId/submissions")
  @ApiOperation({ summary: "Submit student answers for a teacher testing session" })
  @ApiBody({ type: SubmitTestingAnswersDto })
  async submitTestingAnswers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("sessionId") sessionId: string,
    @Body() body: SubmitTestingAnswersDto
  ) {
    return this.classroomService.submitTestingAnswers(currentUser, sessionId, body);
  }
}
