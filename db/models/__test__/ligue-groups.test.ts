import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import LigueGroupsModel from '@/db/models/ligue-groups';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await LigueGroupsModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await LigueGroupsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test LigueGroupsModel methods and static functions', () => {
    test('Should get ids only for dolce and gabbana groups', async () => {
        const dolceGroup = await new LigueGroupsModel({
            groupName: 'dolce'
        }).save();

        const gabbanaGroup = await new LigueGroupsModel({
            groupName: 'gabbana'
        }).save();

        const notDrawnGroup = await new LigueGroupsModel({
            groupName: 'nie wylosowano'
        }).save();

        const result = await LigueGroupsModel.getLigueGrouspId();

        const expectedIds = [
            dolceGroup._id.toString(),
            gabbanaGroup._id.toString()
        ].sort();

        expect(result.slice().sort()).toEqual(expectedIds);
        expect(result).not.toContain(notDrawnGroup._id.toString());
        expect(result.length).toBe(2);
    });

    test('Should return empty array when only nie wylosowano exists', async () => {
        await new LigueGroupsModel({
            groupName: 'nie wylosowano'
        }).save();

        const result = await LigueGroupsModel.getLigueGrouspId();

        expect(result).toEqual([]);
    });

    test('Should return empty array when there are no ligue groups', async () => {
        const result = await LigueGroupsModel.getLigueGrouspId();

        expect(result).toEqual([]);
    });
});
