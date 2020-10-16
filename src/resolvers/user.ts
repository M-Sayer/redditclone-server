import { Resolver, Mutation, Field, Arg, Ctx, ObjectType, Query } from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entities/User";
import argon2 from 'argon2';
import { COOKIE_NAME, FORGOT_PASSWORD } from '../constants';
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from '../utils/validateRegister';
import { sendEmail } from "../utils/sendEmail";
import { v4 } from 'uuid';
import { getConnection } from "typeorm";

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
async changePassword(
  @Arg('token') token: string,
  @Arg('newPassword') newPassword: string,
  @Ctx() {redis, req}: MyContext
): Promise<UserResponse> {
  if (newPassword.length <= 3) {
    return { 
      errors: [
        {
          field: 'newPassword',
          message: 'password must be at least 4 characters'
        },
      ],
    };
  }

  const key = FORGOT_PASSWORD + token;
  const userId = await redis.get(key);
  if (!userId) {
    return { 
      errors: [
        {
          field: 'token',
          message: 'token expired'
        },
      ],
    };
  }
  const uid = parseInt(userId);
  const user = await User.findOne(uid);
  
  if (!user) {
    return {
      errors: [
        {
          field: 'token',
          message: 'user no longer exists'
        },
      ],
    }
  }
  
  await User.update(
    { id: uid },
    { password: await argon2.hash(newPassword)} 
  );

  await redis.del(key);

  // log in user after change password
  req.session.userId = user.id;

  return { user };
}

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis } : MyContext
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) return true;

    const token = v4();
    await redis.set(
      FORGOT_PASSWORD + token, 
      user.id, 
      'ex', 1000 * 60 * 60 * 24 * 3 // 3 days
    ); 

    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );

    return true;
  }

  @Query(() => User, { nullable: true })
  me(
    @Ctx() { req }: MyContext
  ) {
    //you are not logged in
    if (!req.session.userId) return null;

    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  //reigster endpoint
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse>{
    const errors = validateRegister(options);
    if (errors) return { errors };

    const hashedPassword = await argon2.hash(options.password);
    let user;

    try {
      const result = await getConnection().createQueryBuilder()
        .insert().into(User).values({
          username: options.username, 
          password: hashedPassword,
          email: options.email,
        })
        .returning('*')
        .execute();

      user = result.raw[0];
    } catch (error) {
      if (error.detail.includes('email')) {
        return {
          errors: [
            {
              field: 'email',
              message: 'that email is already taken',
            },
          ],
        };
      }

      if (error.detail.includes('username')) {
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
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> { 
    //make this tolowercase
    const user = await User.findOne(
      usernameOrEmail.includes('@') 
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
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