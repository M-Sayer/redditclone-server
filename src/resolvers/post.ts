import { 
  Resolver, 
  Query, 
  Ctx, 
  Arg, 
  Mutation, 
  InputType, 
  Field, 
  UseMiddleware, 
  Int,
  FieldResolver,
  Root
} from "type-graphql";
import { getConnection } from "typeorm";
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

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String) 
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  //get posts
  @Query(() => [Post])
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null
  ): Promise<Post[]> {
    const maxLimit = Math.min(50, limit);
    const query = getConnection()
      .getRepository(Post)
      .createQueryBuilder('p')      
      .orderBy('"createdAt"', 'DESC')
      .take(maxLimit);

    if (cursor) query.where('"createdAt" < :cursor', { 
      cursor: new Date(parseInt(cursor)) 
    });

    return query.getMany()

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