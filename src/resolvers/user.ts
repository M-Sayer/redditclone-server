import { Resolver, Mutation, InputType, Field, Arg, Ctx, ObjectType, Query } from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import argon2 from 'argon2';
import { EntityManager } from '@mikro-orm/postgresql';

//input fields
@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

//error fields
@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

//query response object, can be user or error
@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true})
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

//user resolver, similar to REST route
@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(
    @Ctx() { em, req }: MyContext
  ) {
    //you are not logged in
    if (!req.session.userId) { return null }

    const user = await em.findOne(User, { id: req.session.userId });
    return user
  }

  @Mutation(() => UserResponse)
  //reigster endpoint
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse>{
    if (options.username.length <= 1) {
      return {
        errors: [
          {
            field: 'username',
            message: 'username must be at least 2 characters'
          },
        ],
      };
    }

    if (options.password.length <= 3) {
      return {
        errors: [
          {
            field: 'password',
            message: 'password must be at least 4 characters'
          },
        ],
      };
    }

    const hashedPassword = await argon2.hash(options.password);
    let user;

    try {
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          username: options.username, 
          password: hashedPassword,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      user = result[0];
    } catch (error) {
      //duplicate username error
      // || error.detail.includes('already exists'
      if (error.code === '23505') {
        return {
          errors: [
            {
              field: 'username',
              message: 'that username is already taken',
            },
          ],
        }
      }
      console.log(error)
    }

    //store user id session to log them in
    //sets cookies and keeps them logged in
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> { 
    //make this tolowercase
    const user = await em.findOne(User, { username: options.username })
    if (!user) {
      return {
        errors: [
          { 
            field: 'username',
            message: "that username doesn't exiser"
        },
      ],
      };
    }

    const valid = await argon2.verify(user.password, options.password);
    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: "incorrect password"
          },
        ],
      };
    }

    req.session.userId = user.id;

    return { user }
  }
}