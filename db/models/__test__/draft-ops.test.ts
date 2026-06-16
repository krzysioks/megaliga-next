import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import DraftOpsModel from '@/db/models/draft/draft-ops';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await DraftOpsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test DraftOps methods and static functions', () => {
    it('Should get current draft config using getDraftConfig static function', async () => {
        await new DraftOpsModel({
            draftWindowOpen: true,
            draftCurrentRoundDolce: 30,
            draftCurrentRoundGabbana: 20,
            playoffDraftWindowOpen: false,
            playoffDraftCurrentRound: 0,
            draftRound1OrderLotteryOpen: false,
            groupLotteryOpen: true
        }).save();

        const draftConfig = await DraftOpsModel.getDraftConfig();

        expect(draftConfig).not.toBeNull();
        expect(draftConfig?.draftWindowOpen).toBe(true);
        expect(draftConfig?.draftCurrentRoundDolce).toBe(30);
        expect(draftConfig?.draftCurrentRoundGabbana).toBe(20);
        expect(draftConfig?.playoffDraftWindowOpen).toBe(false);
        expect(draftConfig?.playoffDraftCurrentRound).toBe(0);
        expect(draftConfig?.draftRound1OrderLotteryOpen).toBe(false);
        expect(draftConfig?.groupLotteryOpen).toBe(true);
    });

    it('Should be able to update each field of DraftOpsModel document', async () => {
        const draftOps = await new DraftOpsModel({
            draftWindowOpen: false,
            draftCurrentRoundDolce: 1,
            draftCurrentRoundGabbana: 2,
            playoffDraftWindowOpen: false,
            playoffDraftCurrentRound: 0,
            draftRound1OrderLotteryOpen: false,
            groupLotteryOpen: false
        }).save();

        await draftOps.updateDraftOps({
            draftWindowOpen: true,
            draftCurrentRoundDolce: 5,
            draftCurrentRoundGabbana: 6,
            playoffDraftWindowOpen: true,
            playoffDraftCurrentRound: 3,
            draftRound1OrderLotteryOpen: true,
            groupLotteryOpen: true
        });

        const updated = await DraftOpsModel.findById(draftOps._id).exec();

        expect(updated).not.toBeNull();
        expect(updated?.draftWindowOpen).toBe(true);
        expect(updated?.draftCurrentRoundDolce).toBe(5);
        expect(updated?.draftCurrentRoundGabbana).toBe(6);
        expect(updated?.playoffDraftWindowOpen).toBe(true);
        expect(updated?.playoffDraftCurrentRound).toBe(3);
        expect(updated?.draftRound1OrderLotteryOpen).toBe(true);
        expect(updated?.groupLotteryOpen).toBe(true);
    });

    it('Should not allow to update non existing field', async () => {
        const draftOps = await new DraftOpsModel({
            draftWindowOpen: false,
            draftCurrentRoundDolce: 1,
            draftCurrentRoundGabbana: 2,
            playoffDraftWindowOpen: false,
            playoffDraftCurrentRound: 0,
            draftRound1OrderLotteryOpen: false,
            groupLotteryOpen: false
        }).save();

        await draftOps.updateDraftOps({
            nonExistingField: true
        } as unknown as Parameters<typeof draftOps.updateDraftOps>[0]);

        const updated = await DraftOpsModel.findById(draftOps._id).exec();

        expect(updated).not.toBeNull();
        expect(updated?.draftWindowOpen).toBe(false);
        expect(updated?.draftCurrentRoundDolce).toBe(1);
        expect(updated?.draftCurrentRoundGabbana).toBe(2);
        expect(updated?.playoffDraftWindowOpen).toBe(false);
        expect(updated?.playoffDraftCurrentRound).toBe(0);
        expect(updated?.draftRound1OrderLotteryOpen).toBe(false);
        expect(updated?.groupLotteryOpen).toBe(false);
        expect(
            (updated as unknown as { nonExistingField?: boolean })
                .nonExistingField
        ).toBeUndefined();
    });
});
