import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = request.id || 'unknown-id';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Ocorreu um erro interno inesperado.';
    let isExpectedError = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exceptionResponse;
      } else {
        message = exceptionResponse as string;
      }
      isExpectedError = true;
    } else if (this.isPostgresError(exception)) {
      if (exception.code === '23505') {
        // Unique Violation (Ex: tentar criar um usuário com email já existente)
        status = HttpStatus.CONFLICT;
        message = 'Já existe um registro com estes dados.';
        isExpectedError = true;
      } else if (exception.code === '23503') {
        // Foreign Key Violation
        status = HttpStatus.BAD_REQUEST;
        message = 'O registro associado não existe.';
        isExpectedError = true;
      }
    }

    if (!isExpectedError) {
      this.logger.error(
        {
          err: exception,
          correlationId,
          path: request.url,
          method: request.method,
        },
        'Erro não tratado capturado pelo GlobalExceptionFilter',
      );
      Sentry.captureException(exception);
    } else {
      this.logger.warn(
        { correlationId, path: request.url, status },
        `Falha de requisição: ${Array.isArray(message) ? message.join(', ') : message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      ...(status === HttpStatus.INTERNAL_SERVER_ERROR && {
        supportId: correlationId,
      }),
    });
  }

  private isPostgresError(error: any): error is { code: string } {
    return error && typeof error === 'object' && typeof error.code === 'string';
  }
}
