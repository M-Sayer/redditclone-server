import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";

export const validateRegister = (options: UsernamePasswordInput) => {
  if (!options.email.includes('@')) {
    return [
      {
        field: 'email',
        message: 'invalid email'
      },
    ];
  }

  if (options.username.length <= 1) {
    return [
      {
        field: 'username',
        message: 'username must be at least 2 characters'
      },
    ];
  }

  if (options.username.includes('@')) {
    return [
      {
        field: 'username',
        message: 'cannot include @'
      },
    ];
  }

  if (options.password.length <= 3) {
    return [
      {
        field: 'password',
        message: 'password must be at least 4 characters'
      },
    ];
  }

  return null;
}