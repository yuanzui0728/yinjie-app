import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  getStatus() {
    return this.systemService.getStatus();
  }

  @Get('scheduler')
  getSchedulerStatus() {
    return this.systemService.getSchedulerStatus();
  }

  @Post('scheduler/run/:id')
  runSchedulerJob(@Param('id') id: string) {
    return this.systemService.runSchedulerJob(id);
  }

  @Get('realtime')
  getRealtimeStatus() {
    return this.systemService.getRealtimeStatus();
  }

  @Get('provider')
  getProviderConfig() {
    return this.systemService.getProviderConfig();
  }

  @Put('provider')
  setProviderConfig(
    @Body()
    body: {
      endpoint: string;
      model: string;
      apiKey?: string;
      mode?: string;
      apiStyle?: string;
      transcriptionEndpoint?: string;
      transcriptionModel?: string;
      transcriptionApiKey?: string;
    },
  ) {
    return this.systemService.setProviderConfig(body);
  }

  @Post('provider/test')
  testProviderConnection(
    @Body()
    body: {
      endpoint: string;
      model: string;
      apiKey?: string;
      mode?: string;
      apiStyle?: string;
      transcriptionEndpoint?: string;
      transcriptionModel?: string;
      transcriptionApiKey?: string;
    },
  ) {
    return this.systemService.testProviderConnection(body);
  }

  @Post('inference/preview')
  runInferencePreview(
    @Body() body: { prompt: string; model?: string; systemPrompt?: string },
  ) {
    return this.systemService.runInferencePreview(body);
  }

  @Get('logs')
  getSystemLogs() {
    return this.systemService.getSystemLogs();
  }

  @Get('evals/overview')
  getEvalOverview() {
    return this.systemService.getEvalOverview();
  }

  @Post('diag/export')
  exportDiagnostics() {
    return this.systemService.exportDiagnostics();
  }

  @Post('backup/create')
  createBackup() {
    return this.systemService.createBackup();
  }

  @Post('backup/restore')
  restoreBackup() {
    return this.systemService.restoreBackup();
  }
}
