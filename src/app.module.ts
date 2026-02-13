import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TasksModule } from './tasks/tasks.module';
import { Task } from './tasks/entities/task.entity';
import { User } from './users/user.entity';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MoodsModule } from './moods/moods.module';
import { Mood } from './moods/entities/mood.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'planner.db',
      entities: [Task, User, Mood],
      synchronize: true,
    }),

    TypeOrmModule.forFeature([User]), 

    JwtModule.register({
      global: true,
      secret: 'SECRET_KEY_123',
      signOptions: { expiresIn: '1h' },
    }),

    TasksModule,

    MoodsModule,

    UsersModule,

  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AppModule {}