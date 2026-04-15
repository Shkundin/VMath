import { Module } from "@nestjs/common";
import { GradingService } from "./grading.service";
import { ResultsService } from "./results.service";

@Module({
  providers: [GradingService, ResultsService],
  exports: [GradingService, ResultsService]
})
export class ResultsModule {}
