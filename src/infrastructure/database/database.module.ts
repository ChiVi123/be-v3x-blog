import { Global, Module } from '@nestjs/common';
import { DrizzleService } from './drizzle/drizzle.service';
import { drizzleProvider, pgClientProvider } from './drizzle/provider';

@Global()
@Module({
  providers: [pgClientProvider, drizzleProvider, DrizzleService],
  exports: [pgClientProvider, drizzleProvider, DrizzleService],
})
export class DatabaseModule {}
