import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfigService, validateEnvironment } from './env';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnvironment,
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: AppConfigService,
      useExisting: ConfigService,
    },
  ],
  exports: [ConfigModule, AppConfigService],
})
export class AppConfigModule {}
