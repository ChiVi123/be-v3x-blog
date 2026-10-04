import { Global, Module } from '@nestjs/common';
import {
  AUTH_SERVICE_TOKEN,
  GET_OK_SERVICE_TOKEN,
  TRANSFORM_SERVICE_TOKEN,
} from '~infrastructure/config/provider-tokens';
import { AuthServiceImpl } from '~infrastructure/services/auth.service';
import { GetOkServiceImpl } from '~infrastructure/services/get-ok.service';
import { TransformServiceImpl } from '~infrastructure/services/transform.service';

@Global()
@Module({
  providers: [
    {
      provide: GET_OK_SERVICE_TOKEN,
      useClass: GetOkServiceImpl,
    },
    {
      provide: AUTH_SERVICE_TOKEN,
      useClass: AuthServiceImpl,
    },
    {
      provide: TRANSFORM_SERVICE_TOKEN,
      useClass: TransformServiceImpl,
    },
  ],
  exports: [GET_OK_SERVICE_TOKEN, AUTH_SERVICE_TOKEN, TRANSFORM_SERVICE_TOKEN],
})
export class ServicesModule {}
