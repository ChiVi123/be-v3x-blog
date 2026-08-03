import { Module } from '@nestjs/common';
import { AuthController } from '~presentation/controllers/auth.controller';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [],
  exports: [],
})
export class AuthModule {}
