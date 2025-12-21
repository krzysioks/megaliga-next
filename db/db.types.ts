import mongoose from 'mongoose';

export type ConnectType = Promise<void | typeof mongoose>;
