import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
            message: 'Gönderilen bilgiler geçersiz.',
            details: record.message.map(String),
          };
        }
        if (typeof record.message === 'string') {
          return { statusCode, message: record.message };
        }
      }
      return { statusCode, message: 'İstek tamamlanamadı.' };
    }

    if (exception instanceof Error && exception.name === 'NotFoundError') {
      return { statusCode: HttpStatus.NOT_FOUND, message: 'Dosya bulunamadı.' };
    }

    if (isMulterError(exception)) {
      if (exception.code === 'LIMIT_FILE_SIZE') {
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'Her dosya en fazla 5 MB olabilir.' };
      }
      if (exception.code === 'LIMIT_FILE_COUNT' || exception.code === 'LIMIT_UNEXPECTED_FILE') {
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'En fazla 3 fotoğraf ve 1 fiş yükleyebilirsin.' };
      }
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Dosya yüklenemedi.' };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return { statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: 'Veritabanına bağlanılamadı.' };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2021' || exception.code === 'P2022') {
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Veritabanı şeması güncel değil.',
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Bir şeyler karıştı. Biraz sonra tekrar dene.',
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
