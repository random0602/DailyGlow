import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // 1. Create a new user (Used by Controller)
  create(createUserDto: CreateUserDto) {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  // 2. Find ALL users (Used by Controller)
  findAll() {
    return this.usersRepository.find();
  }

  // 3. Find ONE user by ID (Used by Controller)
  findOne(id: number) {
    return this.usersRepository.findOneBy({ id });
  }

  // 4. Find ONE user by Username (Helper for Auth/Login)
  findByUsername(username: string) {
    return this.usersRepository.findOneBy({ username });
  }

  // 5. Update a user (Used by Controller)
  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) {
      throw new Error('User not found');
    }
    // Update the user with new data
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  // 6. Delete a user (Used by Settings Page)
  async remove(id: number) {
    await this.usersRepository.delete(id);
  }
}