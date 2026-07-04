import { Injectable } from '@nestjs/common';
import type { GetOkService } from '~application/services/get-ok.service';

@Injectable()
export class GetOkServiceImpl implements GetOkService {
  getOk(): string {
    return 'Ok';
  }
}
