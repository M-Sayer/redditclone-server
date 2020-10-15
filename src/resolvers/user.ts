import { Resolver, Mutation, Field, Arg, Ctx, ObjectType, Query } from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entities/User";
import argon2 from 'argon2';
import { EntityManager } from '@mikro-orm/postgresql';
import { COOKIE_NAME } from '../constants';
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from '../utils/validateRegister';

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
  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { em } : MyContext
  ) {
    // const user = await em.findOne(User, { email });
    return true;
  }

  @Query(() => User, { nullable: true })
  async me(
    @Ctx() { em, req }: MyContext
  ) {
    //you are not logged in
    if (!req.session.userId) return null;

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  //reigster endpoint
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse>{
    const errors = validateRegister(options);
    if (errors) return { errors };

    const hashedPassword = await argon2.hash(options.password);
    let user;

    try {
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          username: options.username, 
          password: hashedPassword,
          email: options.email,
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
        };
      }
    }

    //store user id session to log them in
    //sets cookies and keeps them logged in
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> { 
    //make this tolowercase
    const user = await em.findOne(
      User, 
      usernameOrEmail.includes('@') 
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    );

    if (!user) {
      return {
        errors: [
          { 
            field: 'usernameOrEmail',
            message: "that account doesn't exist"
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password, password);
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

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise(resolve =>
      req.session.destroy(err => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }

        resolve(true);
      })
    );
  }
}