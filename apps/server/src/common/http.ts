import {
  ArgumentsHost,
  BadRequestException,
  CallHandler,
  Catch,
  createParamDecorator,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ErrorCode, Role } from "@vm/shared";
import { Observable, tap } from "rxjs";

export interface AuthenticatedUser {
  userId: string;
  login: string;
  role: Role;
  sessionId?: string;
}

export type RequestWithUser = {
  currentUser?: AuthenticatedUser;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  method?: string;
  url?: string;
};

export class AppException extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

@Catch()
export class GlobalExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const request = ctx.getRequest<RequestWithUser>();

    const normalized = this.normalizeException(exception);

    if (normalized.status >= 500) {
      this.logger.error(
        `${request?.method ?? "UNKNOWN"} ${request?.url ?? ""} -> ${normalized.status} ${normalized.code}`,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    response.status(normalized.status).json({
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details
      },
      path: request?.url ?? "",
      timestamp: new Date().toISOString()
    });
  }

  private normalizeException(exception: unknown): {
    code: ErrorCode;
    status: number;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof AppException) {
      return {
        code: exception.code,
        status: exception.status,
        message: exception.message,
        details: exception.details
      };
    }

    if (exception instanceof UnauthorizedException) {
      return {
        code: "AUTH",
        status: HttpStatus.UNAUTHORIZED,
        message: exception.message
      };
    }

    if (exception instanceof BadRequestException) {
      return {
        code: "VALIDATION",
        status: HttpStatus.BAD_REQUEST,
        message: "Validation failed",
        details: exception.getResponse()
      };
    }

    if (exception instanceof HttpException) {
      return {
        code: exception.getStatus() === HttpStatus.FORBIDDEN ? "FORBIDDEN" : "HTTP",
        status: exception.getStatus(),
        message: exception.message,
        details: exception.getResponse()
      };
    }

    if (exception instanceof Error) {
      return {
        code: "UNKNOWN",
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message
      };
    }

    return {
      code: "UNKNOWN",
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Unexpected server error"
    };
  }
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{ statusCode?: number }>();
          this.logger.log(
            `${request.method ?? "UNKNOWN"} ${request.url ?? ""} ${response.statusCode ?? 200} ${Date.now() - startedAt}ms`
          );
        },
        error: () => {
          const response = context.switchToHttp().getResponse<{ statusCode?: number }>();
          this.logger.warn(
            `${request.method ?? "UNKNOWN"} ${request.url ?? ""} ${response.statusCode ?? 500} ${Date.now() - startedAt}ms`
          );
        }
      })
    );
  }
}

export const CURRENT_USER_KEY = "vm-current-user";
export const ROLES_KEY = "vm-roles";
export const RATE_LIMIT_KEY = "vm-rate-limit";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.currentUser) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Authentication required");
    }

    return request.currentUser;
  }
);

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface RateLimitMetadata {
  limit: number;
  windowMs: number;
}

export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs } satisfies RateLimitMetadata);

@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const currentUser = request.currentUser;

    if (!currentUser) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Authentication required");
    }

    if (!requiredRoles.includes(currentUser.role)) {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Insufficient permissions");
    }

    return true;
  }
}

@Injectable()
export class RateLimitGuard {
  private static readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config =
      this.reflector.getAllAndOverride<RateLimitMetadata>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? null;

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const key = `${request.ip ?? "unknown"}:${request.method ?? "GET"}:${request.url ?? ""}`;
    const now = Date.now();
    const cutoff = now - config.windowMs;
    const previous = RateLimitGuard.hits.get(key) ?? [];
    const active = previous.filter((value) => value >= cutoff);

    if (active.length >= config.limit) {
      throw new AppException(
        "RATE_LIMIT",
        HttpStatus.TOO_MANY_REQUESTS,
        "Too many requests"
      );
    }

    active.push(now);
    RateLimitGuard.hits.set(key, active);
    return true;
  }
}
