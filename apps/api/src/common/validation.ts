import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

function flatten(errors: ValidationError[], parent = ''): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) {
      for (const [key, message] of Object.entries(error.constraints)) {
        messages.push(key === 'whitelistValidation' ? `Bu alan kabul edilmiyor: ${path}` : message);
      }
    }
    if (error.children?.length) {
      messages.push(...flatten(error.children, path));
    }
  }
  return messages;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        message: flatten(errors),
      }),
  });
}
