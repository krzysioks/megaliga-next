import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import { DraftOrderModel } from '@/db/models/draft/draft-order';
import { LigueGroupsModel } from '@/db/models/ligue-groups';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test clear collection
beforeEach(async () => {
    await DraftOrderModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await DraftOrderModel.deleteMany();
    await LigueGroupsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test DraftOrderModel methods and static functions', () => {
    it('Should get available positions by ligue group id', async () => {
        const dolceGroup = await new LigueGroupsModel({
            groupName: 'dolce'
        }).save();

        const gabbanaGroup = await new LigueGroupsModel({
            groupName: 'gabbana'
        }).save();
        const dolceGroupId = dolceGroup._id.toString();
        const gabbanaGroupId = gabbanaGroup._id.toString();

        await new DraftOrderModel({
            ligueGroupsId: dolceGroupId,
            spot: [
                { positionNo: 1, isSelected: false },
                { positionNo: 2, isSelected: true },
                { positionNo: 3, isSelected: false },
                { positionNo: 4, isSelected: true },
                { positionNo: 5, isSelected: false },
                { positionNo: 6, isSelected: false }
            ]
        }).save();

        await new DraftOrderModel({
            ligueGroupsId: gabbanaGroupId,
            spot: [
                { positionNo: 1, isSelected: false },
                { positionNo: 2, isSelected: false },
                { positionNo: 3, isSelected: true },
                { positionNo: 4, isSelected: true },
                { positionNo: 5, isSelected: true },
                { positionNo: 6, isSelected: true }
            ]
        }).save();

        const availablePositionsDolce =
            await DraftOrderModel.getAvailablePositionsByLigueGroup(
                dolceGroupId
            );

        const availablePositionsGabbana =
            await DraftOrderModel.getAvailablePositionsByLigueGroup(
                gabbanaGroupId
            );

        expect(availablePositionsDolce).toBe(4);
        expect(availablePositionsGabbana).toBe(2);
    });
});
