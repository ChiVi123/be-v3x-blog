import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigModule } from '~infrastructure/config/config.module';
import { AppConfigService } from '~infrastructure/config/env';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { RepositoriesModule } from '~infrastructure/repositories/repositories.module';
import { ServicesModule } from '~infrastructure/services/services.module';
import { AuthModule, HealthCheckModule, UserModule } from '~presentation/modules';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: AppConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('ACCESS_TOKEN_EXPIRY') },
      }),
      inject: [AppConfigService],
    }),
    DatabaseModule,
    RepositoriesModule,
    ServicesModule,
    AuthModule,
    HealthCheckModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
