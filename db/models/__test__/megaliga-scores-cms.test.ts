import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import MegaligaScoresCmsModel, {
    MegaligaScoresCmsType
} from '@/db/models/cms/megaliga-scores-cms';

type SeasonStageType = MegaligaScoresCmsType['seasonStage'];

describe('Test MegaligaScoresCmsModel methods and static functions', () => {
    beforeAll(async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const dbClient = new DBClient();
        await dbClient.connect();
    });

    beforeEach(async () => {
        await MegaligaScoresCmsModel.deleteMany();
    });

    afterAll(async () => {
        await MegaligaScoresCmsModel.deleteMany();
        await mongoose.disconnect();
    });

    test('Should fetch cms content for given round and stage', async () => {
        const editorJsContent = {
            time: 1720000000000,
            version: '2.29.1',
            blocks: [
                {
                    id: 'block-1',
                    type: 'header',
                    data: {
                        text: 'Round summary',
                        level: 2
                    }
                },
                {
                    id: 'block-2',
                    type: 'paragraph',
                    data: {
                        text: 'Team One won after a close matchup.'
                    }
                }
            ]
        };

        const roundNumber = 4;
        const seasonStage: SeasonStageType = 'playoff';

        await MegaligaScoresCmsModel.create({
            roundNumber,
            seasonStage,
            content: editorJsContent
        });

        const result = await MegaligaScoresCmsModel.getCmsBlockByRoundAndStage(
            roundNumber,
            seasonStage
        );

        expect(result).toEqual(editorJsContent);
    });

    test('Should throw error if document not found for given roundNumber and seasonStage', async () => {
        const roundNumber = 7;
        const seasonStage: SeasonStageType = 'playIn';

        await expect(
            MegaligaScoresCmsModel.getCmsBlockByRoundAndStage(
                roundNumber,
                seasonStage
            )
        ).rejects.toThrow(
            `Failed to fetch CMS block for megaliga scores round ${roundNumber} and stage ${seasonStage}:`
        );
    });
});
