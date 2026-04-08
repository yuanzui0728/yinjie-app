import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { CharacterEntity } from '../characters/character.entity';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.adminService.getUsers(Number(page), Number(limit));
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('system')
  getSystem() {
    return this.adminService.getSystemInfo();
  }

  @Get('config')
  getConfig() {
    return this.adminService.getConfig();
  }

  @Patch('config')
  setConfig(@Body() body: { key: string; value: string }) {
    return this.adminService.setConfig(body.key, body.value);
  }

  @Get('characters')
  getCharacters() {
    return this.adminService.findAllCharacters();
  }

  @Post('characters')
  createCharacter(@Body() body: Partial<CharacterEntity>) {
    return this.adminService.createCharacter(body);
  }

  @Patch('characters/:id')
  updateCharacter(@Param('id') id: string, @Body() body: Partial<CharacterEntity>) {
    return this.adminService.updateCharacter(id, body);
  }

  @Delete('characters/:id')
  deleteCharacter(@Param('id') id: string) {
    return this.adminService.deleteCharacter(id);
  }
}
