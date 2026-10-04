import { Module } from '@nestjs/common';
import { UserController } from '~presentation/controllers/user.controller';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [],
  exports: [],
})
export class UserModule {}
