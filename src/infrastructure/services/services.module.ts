import { Global, Module } from '@nestjs/common';
import { AUTH_SERVICE_TOKEN, GET_OK_SERVICE_TOKEN } from '~infrastructure/config/provider-tokens';
import { AuthServiceImpl } from '~infrastructure/services/auth.service';
import { GetOkServiceImpl } from '~infrastructure/services/get-ok.service';

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
  ],
  exports: [GET_OK_SERVICE_TOKEN, AUTH_SERVICE_TOKEN],
})
export class ServicesModule {}
