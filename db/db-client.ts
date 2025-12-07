import 'server-only';

import mongoose from 'mongoose';

export class DBClient {
    constructor() {}

    public async connect() {
        // Return existing connection if available
        if (globalThis.MONGOOSE_CLIENT) {
            console.debug('[DB-client] Connection already exists');
            return globalThis.MONGOOSE_CLIENT;
        }

        try {
            // Connect to MongoDB
            globalThis.MONGOOSE_CLIENT = await mongoose.connect(
                `mongodb+srv://${process.env.USER_DB}:${encodeURIComponent(
                    process.env.PASSWORD_DB || ''
                )}@kp-cluster.9wm4hdz.mongodb.net/?appName=KP-cluster`
            );

            console.debug('[DB-client] Connected to MongoDB');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            mongoose.connection.close();
        }
    }
}
