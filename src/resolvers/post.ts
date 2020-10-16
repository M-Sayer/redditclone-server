import { 
  Resolver, 
  Query, 
  Ctx, 
  Arg, 
  Mutation, 
  InputType, 
  Field, 
  UseMiddleware 
} from "type-graphql";
import { Post } from "../entities/Post";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";

@InputType()
class PostInput {
  @Field()
  title: string
  @Field()
  text: string
}

@Resolver()
export class PostResolver {
  //get posts
  @Query(() => [Post])
  async posts(): Promise<Post[]> {
    return Post.find();
  }
  //get post
  @Query(() => Post, { nullable: true })
  post(@Arg('id') id: number): Promise<Post | undefined> {
    return Post.findOne(id); 
  }
  //create post
  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    console.log('req id: ', req.session.userId)
    return Post.create({
      ...input,
      authorId: req.session.userId,
    }).save(); 
  }
  //update post
  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne(id);
    if (!post) return null;
    if (typeof title !== 'undefined') { 
      await Post.update({id}, {title});
    }

    return post; 
  }
  //delete post
  @Mutation(() => Boolean)
  async deletePost(@Arg('id') id: number): Promise<Boolean> {
    await Post.delete(id);
    return true; 
  }
}