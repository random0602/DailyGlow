import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity()
export class Mood {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  emoji: string;

  @Column({ nullable: true })
  note: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @ManyToOne(() => User, (user) => user.moods)
  user: User;
}