import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DatabaseService } from "../database/database.service";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get("health")
  @ApiOperation({ summary: "Health check endpoint" })
  async health() {
    const databaseOk = await this.database.ping();

    return {
      ok: databaseOk,
      service: "vm-server",
      timestamp: new Date().toISOString(),
      database: databaseOk ? "up" : "down"
    };
  }

  @Get("api/v1/health")
  @ApiOperation({ summary: "Versioned health check endpoint" })
  async versionedHealth() {
    return this.health();
  }
}
