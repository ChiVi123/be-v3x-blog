import { Injectable } from '@nestjs/common';
import type { AuthService } from '~application/services/auth.service';

@Injectable()
export class AuthServiceImpl implements AuthService {
  async hashPassword(password: string): Promise<string> {
    return password;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return password === hash;
  }
}
