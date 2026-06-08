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
});
