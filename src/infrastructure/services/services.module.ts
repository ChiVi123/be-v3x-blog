import { Global, Module } from '@nestjs/common';
import { GET_OK_SERVICE_TOKEN } from '~infrastructure/config/provider-tokens';
import { GetOkServiceImpl } from '~infrastructure/services/get-ok.service';

@Global()
@Module({
  providers: [
    {
      provide: GET_OK_SERVICE_TOKEN,
      useClass: GetOkServiceImpl,
    },
  ],
  exports: [GET_OK_SERVICE_TOKEN],
})
export class ServicesModule {}
