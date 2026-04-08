import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
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

  @Get('me')
  getCurrentUser(@Headers('authorization') authorization?: string) {
    return this.authService.getCurrentUser(authorization);
  }

  @Get('sessions')
  listSessions(@Headers('authorization') authorization?: string) {
    return this.authService.listSessions(authorization);
  }

  @Post('logout')
  logout() {
    return this.authService.logout();
  }

  @Post('logout-all')
  logoutAll() {
    return this.authService.logoutAll();
  }

  @Post('sessions/:sessionId/revoke')
  revokeSession(@Param('sessionId') _sessionId: string) {
    return this.authService.revokeSession();
  }

  @Patch('users/:id/onboarding-complete')
  completeOnboarding(@Param('id') id: string) {
    return this.authService.completeOnboarding(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { username?: string; avatar?: string; signature?: string },
    @Headers('authorization') authorization?: string,
  ) {
    return this.authService
      .ensureAuthorizedUser(id, authorization)
      .then(() => this.authService.updateUser(id, body));
  }

  @Patch('users/:id/api-key')
  setApiKey(
    @Param('id') id: string,
    @Body() body: { apiKey: string; apiBase?: string },
    @Headers('authorization') authorization?: string,
  ) {
    return this.authService
      .ensureAuthorizedUser(id, authorization)
      .then(() => this.authService.setUserApiKey(id, body.apiKey, body.apiBase));
  }

  @Delete('users/:id/api-key')
  clearApiKey(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.authService
      .ensureAuthorizedUser(id, authorization)
      .then(() => this.authService.clearUserApiKey(id));
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.authService
      .ensureAuthorizedUser(id, authorization)
      .then(() => this.authService.deleteUser(id));
  }
}
