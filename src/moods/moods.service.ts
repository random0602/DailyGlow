import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMoodDto } from './dto/create-mood.dto';
import { UpdateMoodDto } from './dto/update-mood.dto'; // Ensure this file exists
import { Mood } from './entities/mood.entity';

@Injectable()
export class MoodsService {
  constructor(
    @InjectRepository(Mood)
    private moodsRepository: Repository<Mood>,
  ) {}

  // 1. Create a new mood
  create(createMoodDto: CreateMoodDto) {
    const mood = this.moodsRepository.create(createMoodDto);
    return this.moodsRepository.save(mood);
  }

  // 2. Get all moods (sorted by newest first)
  findAll() {
    return this.moodsRepository.find({ order: { date: 'DESC' } });
  }

  // 3. Get one specific mood
  findOne(id: number) {
    return this.moodsRepository.findOneBy({ id });
  }

  // 4. Update a mood (e.g. change the note)
  async update(id: number, updateMoodDto: UpdateMoodDto) {
    const mood = await this.findOne(id);
    if (!mood) throw new NotFoundException();
    
    // Merge the new data with the existing mood
    return this.moodsRepository.save({ ...mood, ...updateMoodDto });
  }

  // 5. Delete a mood
  async remove(id: number) {
    const mood = await this.findOne(id);
    if (!mood) throw new NotFoundException();
    
    return this.moodsRepository.remove(mood);
  }
}