import { BadRequestException, HttpException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function hostWith(json: jest.Mock): ArgumentsHost {
  const status = jest.fn().mockReturnValue({ json });
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/restaurants' }),
    }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  it('does not leak stack traces or internal messages', () => {
    const json = jest.fn();
    const filter = new AllExceptionsFilter();
    const boom = new Error('sqlite file /secret/dev.db missing');
    boom.stack = 'Error: sqlite file /secret/dev.db missing\n    at PrismaClient.connect';
    filter.catch(boom, hostWith(json));
    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toEqual({
      statusCode: 500,
      message: 'Bir şeyler karıştı. Biraz sonra tekrar dene.',
    });
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('Prisma');
  });

  it('flattens validation messages without a stack', () => {
    const json = jest.fn();
    const filter = new AllExceptionsFilter();
    filter.catch(
      new BadRequestException({ message: ['Ad en az 2 karakter olmalı.'], error: 'Bad Request' }),
      hostWith(json),
    );
    expect(json.mock.calls[0][0]).toEqual({
      statusCode: 400,
      message: 'Gönderilen bilgiler geçersiz.',
      details: ['Ad en az 2 karakter olmalı.'],
    });
  });

  it('passes through http exception strings', () => {
    const json = jest.fn();
    const filter = new AllExceptionsFilter();
    filter.catch(new HttpException('Mekan bulunamadı.', 404), hostWith(json));
    expect(json.mock.calls[0][0]).toEqual({
      statusCode: 404,
      message: 'Mekan bulunamadı.',
    });
  });
});
