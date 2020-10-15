"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegister = void 0;
exports.validateRegister = (options) => {
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
};
//# sourceMappingURL=validateRegister.js.map