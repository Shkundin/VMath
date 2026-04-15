import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, AppConfigService, loadAppConfig } from "../config/app-config";
import { DB_POOL, DatabaseService, createPgPool } from "./database.service";

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useValue: loadAppConfig()
    },
    AppConfigService,
    {
      provide: DB_POOL,
      useFactory: createPgPool,
      inject: [APP_CONFIG]
    },
    DatabaseService
  ],
  exports: [AppConfigService, DatabaseService, DB_POOL]
})
export class DatabaseModule {}
