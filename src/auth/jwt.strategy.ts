import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 👇 This must match the secret in your AppModule!
      secretOrKey: process.env.JWT_SECRET || 'MySecretKey123!', 
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}