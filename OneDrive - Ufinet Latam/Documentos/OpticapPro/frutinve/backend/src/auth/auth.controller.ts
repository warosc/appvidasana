import { Body, Controller, Post } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { LoginDto, PasswordRequestDto } from "./auth.dto";
import { AuthService } from "./auth.service";

@Public()
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post("password-request")
  passwordRequest(@Body() body: PasswordRequestDto) {
    return this.authService.requestPasswordReset(body);
  }
}
