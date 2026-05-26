import 'server-only';

import type { ConnectType } from '@/db/db.types';

import mongoose from 'mongoose';

export class DBClient {
    constructor() {}

    public async connect(): ConnectType {
        // Return existing connection if available
        if (globalThis.MONGOOSE_CLIENT) {
            console.debug('[DB-client] Connection already exists');
            return globalThis.MONGOOSE_CLIENT;
        }

        try {
            // Connect to MongoDB
            globalThis.MONGOOSE_CLIENT = await mongoose.connect(
                this.getMongoUri()
            );

            console.debug('[DB-client] Connected to MongoDB');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            mongoose.connection.close();
        }
    }

    private getMongoUri(): string {
        const isTestEnv = process.env.NODE_ENV === 'test';
        const username = isTestEnv
            ? process.env.USER_DB_TEST
            : process.env.USER_DB;
        const password = isTestEnv
            ? process.env.PASSWORD_DB_TEST
            : process.env.PASSWORD_DB;
        const dbName = isTestEnv
            ? process.env.DB_NAME_TEST
            : process.env.DB_NAME;

        if (!username || !password || !dbName) {
            throw new Error('Missing MongoDB configuration.');
        }

        return `mongodb+srv://${username}:${encodeURIComponent(password)}@kp-cluster.9wm4hdz.mongodb.net/${dbName}?appName=KP-cluster`;
    }
}
