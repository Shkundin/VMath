import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { LecturesModule } from "./lectures/lectures.module";
import { ModulesModule } from "./modules/modules.module";
import { ResultsModule } from "./results/results.module";
import { SessionsModule } from "./sessions/sessions.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    ModulesModule,
    LecturesModule,
    ResultsModule,
    SessionsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
