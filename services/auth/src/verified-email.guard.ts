import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from './auth.types';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user?.emailVerified) {
      throw new ForbiddenException('E-postanı doğrulamadan mekan ekleyemez, şikayet bırakamaz veya oy veremezsin.');
    }
    return true;
  }
}
