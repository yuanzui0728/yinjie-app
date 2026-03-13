import { Controller, Post, Patch, Body, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: { username: string; password: string }) {
    return this.authService.register(body.username, body.password);
  }

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  // Onboarding: create user with just a name, no password
  @Post('init')
  initUser(@Body() body: { username: string }) {
    return this.authService.initUser(body.username);
  }

  @Patch('users/:id/onboarding-complete')
  completeOnboarding(@Param('id') id: string) {
    return this.authService.completeOnboarding(id);
  }
}
