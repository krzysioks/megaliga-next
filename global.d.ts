import mongoose from 'mongoose';
/* eslint-disable no-var */
declare global {
    namespace globalThis {
        var MONGOOSE_CLIENT: typeof mongoose | null;
    }
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test';
            MONGODB_URI?: string;
            MONGODB_URI_TEST?: string;
            USER_DB?: string;
            PASSWORD_DB?: string;
            USER_DB_TEST?: string;
            PASSWORD_DB_TEST?: string;
            DB_NAME?: string;
            DB_NAME_TEST?: string;
        }
    }
}
