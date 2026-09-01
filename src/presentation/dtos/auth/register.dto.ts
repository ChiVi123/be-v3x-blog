import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Role } from '~domain/entities/user.entity';
import { LoginRequest } from '../login.dto';

export class RegisterRequest extends LoginRequest {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
