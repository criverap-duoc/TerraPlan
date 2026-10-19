import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { AuthenticatedUser } from '../types/auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new UnauthorizedException('Se requiere autenticación.');
    }

    return request.user;
  },
);
