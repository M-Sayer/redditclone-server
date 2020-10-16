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
  Root,
  ObjectType
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

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[]
  @Field()
  hasMore: boolean
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String) 
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  //get posts
  @Query(() => PaginatedPosts)
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    const maxLimit = Math.min(50, limit);
    const query = getConnection()
      .getRepository(Post)
      .createQueryBuilder('p')      
      .orderBy('"createdAt"', 'DESC')
      .take(maxLimit + 1); // check if there are more posts than requested

    if (cursor) query.where('"createdAt" < :cursor', { 
      cursor: new Date(parseInt(cursor)) 
    });

    const posts = await query.getMany();

    return { 
      posts: posts.slice(0, maxLimit), // remove extra post if there is one
      hasMore: posts.length === maxLimit + 1,
    }

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