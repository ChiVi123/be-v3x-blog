import { Module } from '@nestjs/common';
import { AppConfigModule } from '~infrastructure/config/config.module';
import { DatabaseModule } from '~infrastructure/database/database.module';
import { RepositoriesModule } from '~infrastructure/repositories/repositories.module';
import { ServicesModule } from '~infrastructure/services/services.module';
import { AuthModule, HealthCheckModule, UserModule } from '~presentation/modules';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
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
