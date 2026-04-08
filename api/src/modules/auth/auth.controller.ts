import { Controller, Post, Patch, Delete, Body, Param } from '@nestjs/common';
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

  @Post('init')
  initUser(@Body() body: { username: string }) {
    return this.authService.initUser(body.username);
  }

  @Patch('users/:id/onboarding-complete')
  completeOnboarding(@Param('id') id: string) {
    return this.authService.completeOnboarding(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { username?: string; avatar?: string; signature?: string },
  ) {
    return this.authService.updateUser(id, body);
  }

  @Patch('users/:id/api-key')
  setApiKey(
    @Param('id') id: string,
    @Body() body: { apiKey: string; apiBase?: string },
  ) {
    return this.authService.setUserApiKey(id, body.apiKey, body.apiBase);
  }

  @Delete('users/:id/api-key')
  clearApiKey(@Param('id') id: string) {
    return this.authService.clearUserApiKey(id);
  }
}
