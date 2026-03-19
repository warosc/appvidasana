import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

/** Errores de PostgreSQL que queremos manejar explícitamente */
const PG_UNIQUE_VIOLATION = "23505";
const PG_FK_VIOLATION = "23503";
const PG_CHECK_VIOLATION = "23514";
const PG_NOT_NULL_VIOLATION = "23502";

interface PgError {
  code: string;
  constraint?: string;
  detail?: string;
}

/**
 * Filtro global de excepciones. Captura:
 * - HttpExceptions de NestJS (BadRequest, NotFound, etc.)
 * - Errores de PostgreSQL (unique, FK, check violations)
 * - Errores inesperados → 500 sin exponer stack trace al cliente
 *
 * Registro en AppModule:
 *   providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }]
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.resolve(exception);

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message.join(", ") : message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === "string"
          ? res
          : (res as { message: string | string[] }).message;
      return {
        status,
        message: Array.isArray(message) ? message.join(", ") : message,
      };
    }

    if (this.isPgError(exception)) {
      return this.resolvePgError(exception as PgError);
    }

    this.logger.error("Excepcion no controlada", exception);
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: "Error interno del servidor." };
  }

  private resolvePgError(err: PgError): { status: number; message: string } {
    switch (err.code) {
      case PG_UNIQUE_VIOLATION: {
        let message = "Ya existe un registro con esos datos.";
        if (err.constraint?.includes("username")) message = "El nombre de usuario ya existe.";
        else if (err.constraint?.includes("_code_")) message = "El codigo ya esta en uso.";
        else if (err.constraint?.includes("_phone_")) message = "El telefono ya esta registrado.";
        return { status: HttpStatus.CONFLICT, message };
      }
      case PG_FK_VIOLATION:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: "Referencia a un registro que no existe o ha sido eliminado.",
        };
      case PG_CHECK_VIOLATION:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: "El valor proporcionado no esta dentro de los valores permitidos.",
        };
      case PG_NOT_NULL_VIOLATION:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: "Falta un campo obligatorio en la solicitud.",
        };
      default:
        this.logger.error(`Error de base de datos no controlado [${err.code}]`, err);
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: "Error interno del servidor." };
    }
  }

  private isPgError(exception: unknown): exception is PgError {
    return (
      typeof exception === "object" &&
      exception !== null &&
      "code" in exception &&
      typeof (exception as { code: unknown }).code === "string" &&
      /^\d{5}$/.test((exception as PgError).code)
    );
  }
}
