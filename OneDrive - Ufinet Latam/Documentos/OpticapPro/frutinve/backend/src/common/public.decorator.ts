import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marca un endpoint como público (sin JWT requerido).
 * Uso: @Public() antes de @Get() / @Post() o a nivel de controlador.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
