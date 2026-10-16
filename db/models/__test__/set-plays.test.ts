import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import { SetPlayEnumType } from '@/db/models/schema.types';
import SetPlaysModel from '@/db/models/set-plays';

beforeAll(async () => {
    await new DBClient().connect();
});

afterAll(async () => {
    await SetPlaysModel.deleteMany();
    await mongoose.connection.close();
});

test('stores available play definitions and rejects invalid names and types', async () => {
    const play = await SetPlaysModel.create({
        name: 'Remis',
        type: SetPlayEnumType.Remis
    });
    expect(await SetPlaysModel.findById(play._id).lean().exec()).toMatchObject({
        name: 'Remis',
        type: SetPlayEnumType.Remis
    });
    for (const input of [
        { type: SetPlayEnumType.Remis },
        { name: 'x'.repeat(256), type: SetPlayEnumType.Remis },
        { name: 'Unknown', type: 'unknown' },
        { name: 'Remis' }
    ]) {
        await expect(SetPlaysModel.create(input)).rejects.toThrow();
    }
});
