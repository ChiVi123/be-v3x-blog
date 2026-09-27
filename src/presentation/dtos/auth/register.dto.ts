import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { LoginRequest } from '../login.dto';

export class PublicRegisterRequest extends LoginRequest {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain alphanumeric characters, underscores, and hyphens',
  })
  username: string;
}
