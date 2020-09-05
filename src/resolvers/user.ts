import { Resolver, Mutation, InputType, Field, Arg, Ctx, ObjectType } from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import argon2 from 'argon2';

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
  @Mutation(() => UserResponse)
  //reigster endpoint
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em }: MyContext
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
    const user = em.create(User, { username: options.username, password: hashedPassword });

    try {
      await em.persistAndFlush(user);
    } catch (error) {
      //duplicate username error
      if (error.code === '23505' || error.detail.includes('already exists')) {
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