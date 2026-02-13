import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signUp(username: string, pass: string): Promise<void> {
    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash(pass, salt);
    const user = this.usersRepository.create({ username, password });
    await this.usersRepository.save(user);
  }

  async signIn(username: string, pass: string): Promise<{ accessToken: string }> {
    const user = await this.usersRepository.findOneBy({ username });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const payload = { username: user.username, sub: user.id };
      return {
        accessToken: this.jwtService.sign(payload),
      };
    }
    throw new UnauthorizedException('Please check your login details');
  }
}