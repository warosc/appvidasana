import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as jwt from "jsonwebtoken";
import { IS_PUBLIC_KEY } from "../common/public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    // Rutas marcadas con @Public() no requieren token
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException("JWT_SECRET no configurado en el servidor.");
    }

    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) {
      throw new UnauthorizedException("Token requerido.");
    }

    try {
      const payload = jwt.verify(token, secret);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Token invalido.");
    }
  }
}
