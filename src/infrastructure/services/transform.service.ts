import { Injectable } from '@nestjs/common';
import slugifyLib from 'slugify';
import type { TransformService } from '~application/services/transform.service';

@Injectable()
export class TransformServiceImpl implements TransformService {
  slugify(text: string): string {
    return slugifyLib(text, {
      lower: true,
      strict: true,
    });
  }
}
