import { Field, ObjectType } from "type-graphql";
import { 
  BaseEntity, 
  Column, 
  CreateDateColumn, 
  Entity, 
  ManyToOne, 
  OneToMany, 
  PrimaryGeneratedColumn, 
  UpdateDateColumn, 
} from "typeorm";
import { Vote } from "./Vote";
import { Users } from "./Users";

@ObjectType()
@Entity()
export class Post extends BaseEntity{
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  text!: string;

  @Field()
  @Column({ type: 'int', default: 0 })
  points!: number;

  @Field()
  @Column()
  authorId: number;

  @Field()
  @ManyToOne(() => Users, users => users.posts)
  author: Users;

  @OneToMany(() => Vote, vote => vote.user)
  votes: Vote[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;

}  