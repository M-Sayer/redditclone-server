import { Field, ObjectType } from "type-graphql";
import { 
  BaseEntity, 
  Column, 
  Entity, 
  ManyToOne,
  PrimaryColumn, 
} from "typeorm";
import { Post } from "./Post";
import { Users } from "./Users";

@ObjectType()
@Entity()
export class Vote extends BaseEntity{
  @Field()
  @Column({ type: 'int' })
  value: number;

  
  @Field()
  @PrimaryColumn()
  userId: number;

  @Field(() => Users)
  @ManyToOne(() => Users, users => users.votes)
  user: Users;

  @Field()
  @PrimaryColumn()
  postId: number;

  @Field(() => Post)
  @ManyToOne(() => Post, post => post.votes)
  post: Post;

}  