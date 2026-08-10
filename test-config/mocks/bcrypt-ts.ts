// lightweight stand-in for ESM-only bcrypt-ts — avoids CJS/ESM conflict in Jest
export const hash = async (
    password: string,
    _rounds: number
): Promise<string> => `hashed:${password}`;

export const compare = async (
    password: string,
    hash: string
): Promise<boolean> => hash === `hashed:${password}`;
