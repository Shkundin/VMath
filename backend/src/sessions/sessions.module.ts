import { Module } from "@nestjs/common";
import { ResultsModule } from "../results/results.module";
import { LegacySessionsController, SessionsController } from "./sessions.controller";
import { SessionsGateway } from "./sessions.gateway";
import { SessionsService } from "./sessions.service";

@Module({
  imports: [ResultsModule],
  controllers: [SessionsController, LegacySessionsController],
  providers: [SessionsService, SessionsGateway],
  exports: [SessionsService]
})
export class SessionsModule {}
