import { Controller, Get, UseGuards } from '@nestjs/common';
// biome-ignore lint/style/useImportType: Facade class is required for NestJS DI reflection
import { AdminStatsFacade } from '~application/facades/admin-stats.facade';
import { AdminGuard, JwtAuthGuard } from '~presentation/guards';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStatsController {
  constructor(private readonly adminStatsFacade: AdminStatsFacade) {}

  @Get()
  getStats() {
    return this.adminStatsFacade.getStats();
  }
}
