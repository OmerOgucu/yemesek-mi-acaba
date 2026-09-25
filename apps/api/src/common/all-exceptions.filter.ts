import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiErrorMessage } from '@yemesek/shared';
import type { Response } from 'express';

type ErrorBody = {
  statusCode: number;
  message: string;
  details?: string[];
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();
      if (typeof raw === 'string') {
        return { statusCode, message: raw };
      }
      if (typeof raw === 'object' && raw) {
        const record = raw as { message?: unknown };
        if (Array.isArray(record.message)) {
          return {
            statusCode,
            message: ApiErrorMessage.invalidBody,
            details: record.message.map(String),
          };
        }
        if (typeof record.message === 'string') {
          return { statusCode, message: record.message };
        }
      }
      return { statusCode, message: ApiErrorMessage.requestFailed };
    }

    if (exception instanceof Error && exception.name === 'NotFoundError') {
      return { statusCode: HttpStatus.NOT_FOUND, message: ApiErrorMessage.fileMissing };
    }

    if (isMulterError(exception)) {
      if (exception.code === 'LIMIT_FILE_SIZE') {
        return { statusCode: HttpStatus.BAD_REQUEST, message: ApiErrorMessage.fileTooLarge };
      }
      if (exception.code === 'LIMIT_FILE_COUNT' || exception.code === 'LIMIT_UNEXPECTED_FILE') {
        return { statusCode: HttpStatus.BAD_REQUEST, message: ApiErrorMessage.tooManyFiles };
      }
      return { statusCode: HttpStatus.BAD_REQUEST, message: ApiErrorMessage.uploadFailed };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return { statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: ApiErrorMessage.databaseDown };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2021' || exception.code === 'P2022') {
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: ApiErrorMessage.schemaOutOfDate,
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: ApiErrorMessage.unexpected,
    };
  }
}

function isMulterError(exception: unknown): exception is { code: string } {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as { name?: string }).name === 'MulterError' &&
    typeof (exception as { code?: unknown }).code === 'string'
  );
}
