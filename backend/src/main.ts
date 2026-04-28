import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { WsAdapter } from "@nestjs/platform-ws";
import { GlobalExceptionFilter, RequestLoggingInterceptor } from "./common/http";
import { AppModule } from "./app.module";
import { AppConfigService } from "./config/app-config";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    bufferLogs: true
  });

  const config = app.get(AppConfigService).value;
  const reflector = app.get(Reflector);
  const httpAdapter = app.getHttpAdapter();
  const allowAnyCorsOrigin = config.corsOrigins.includes("*");
  const bodyLimit = process.env.HTTP_BODY_LIMIT?.trim() || "35mb";

  app.useBodyParser("json", { limit: bodyLimit });
  app.useBodyParser("urlencoded", { extended: true, limit: bodyLimit });

  app.enableCors({
    origin: allowAnyCorsOrigin ? true : config.corsOrigins,
    credentials: false
  });
  if (config.trustProxy) {
    const instance = httpAdapter.getInstance() as {
      set?: (name: string, value: unknown) => void;
    };
    instance.set?.("trust proxy", 1);
  }
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.useWebSocketAdapter(new WsAdapter(app));

  const swaggerConfig = new DocumentBuilder()
    .setTitle("VisualMath API")
    .setDescription("Production backend for VisualMath")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    ignoreGlobalPrefix: true
  });
  SwaggerModule.setup("api/docs", app, document);
  httpAdapter.get("/api/v1/openapi.json", (_req, res) =>
    httpAdapter.reply(res, document)
  );

  await app.listen(config.port);
  void reflector;
}

void bootstrap();
