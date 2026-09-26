import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { PrismaService } from '@yemesek/database';
import { tap } from 'rxjs';

type AuditRequest = {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  header(name: string): string | undefined;
  user?: { id: string };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next.handle();
    const started = request.body;
    return next.handle().pipe(
      tap(() => {
        const params = request.params ?? {};
        const entityId = String(params.id ?? params.key ?? 'collection').slice(0, 80);
        const summary = summarize(started);
        void this.prisma.auditLog
          .create({
            data: {
              actorId: request.user?.id,
              action: `${request.method} ${request.path}`.slice(0, 120),
              entityType: entityType(request.path),
              entityId,
              summary,
              ip: clientIp(request),
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}

function entityType(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return (parts[1] ?? 'admin').slice(0, 40);
}

function clientIp(request: AuditRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (raw?.split(',')[0] || request.ip || '').slice(0, 80);
}

function summarize(body: unknown): string {
  if (!body || typeof body !== 'object') return 'değişiklik';
  const record = body as Record<string, unknown>;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (/password|token|secret|code/i.test(key)) continue;
    if (typeof value === 'string') safe[key] = value.slice(0, 120);
    else if (typeof value === 'boolean' || typeof value === 'number') safe[key] = value;
  }
  const text = JSON.stringify(safe);
  return text.slice(0, 500);
}
