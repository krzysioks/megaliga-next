import mongoose from 'mongoose';
/* eslint-disable no-var */
declare global {
    namespace globalThis {
        var MONGOOSE_CLIENT: typeof mongoose | null;
    }
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production';
        }
    }
}
