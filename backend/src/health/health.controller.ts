import { Controller, Get, HttpCode } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DatabaseService } from "../database/database.service";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: "Root API status endpoint" })
  async root() {
    const databaseOk = await this.database.ping();

    return {
      ok: true,
      service: "vm-server",
      status: databaseOk ? "ready" : "degraded",
      docsUrl: "/api/docs",
      healthUrl: "/api/v1/health",
      timestamp: new Date().toISOString()
    };
  }

  @Get("api")
  @ApiOperation({ summary: "API entrypoint summary" })
  async apiRoot() {
    return {
      ok: true,
      docsUrl: "/api/docs",
      openApiUrl: "/api/v1/openapi.json",
      healthUrl: "/api/v1/health"
    };
  }

  @Get("favicon.ico")
  @HttpCode(204)
  favicon() {
    return;
  }

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
