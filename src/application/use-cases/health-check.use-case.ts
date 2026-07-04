import type { GetOkService } from '~application/services/get-ok.service';

export class HealthCheckUseCase {
  constructor(private readonly getOkService: GetOkService) {}

  execute(): string {
    return this.getOkService.getOk();
  }
}
