import { Module } from "@nestjs/common";
import { LecturesController, LegacyLecturesController } from "./lectures.controller";
import { LecturesService } from "./lectures.service";

@Module({
  controllers: [LecturesController, LegacyLecturesController],
  providers: [LecturesService],
  exports: [LecturesService]
})
export class LecturesModule {}
