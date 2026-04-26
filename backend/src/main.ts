import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { WsAdapter } from "@nestjs/platform-ws";
import { GlobalExceptionFilter, RequestLoggingInterceptor } from "./common/http";
import { AppModule } from "./app.module";
import { AppConfigService } from "./config/app-config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const config = app.get(AppConfigService).value;
  const reflector = app.get(Reflector);
  const httpAdapter = app.getHttpAdapter();

  app.enableCors({
    origin: config.corsOrigins,
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
  httpAdapter.get("/api/v1/openapi.json", (_req: unknown, res: { json: (body: unknown) => void }) =>
    res.json(document)
  );

  await app.listen(config.port);
  void reflector;
}

void bootstrap();
