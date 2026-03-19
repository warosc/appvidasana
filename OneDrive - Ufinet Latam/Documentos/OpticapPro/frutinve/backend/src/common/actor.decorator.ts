import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Extrae el username del JWT verificado por AuthGuard.
 * Reemplaza el uso de @Headers("x-actor") para evitar suplantación de identidad.
 *
 * Uso: async create(@Body() body: Dto, @Actor() actor: string) { ... }
 */
export const Actor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: { username?: string } }>();
    return request.user?.username || "system";
  }
);
