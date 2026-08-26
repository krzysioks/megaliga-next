import mongoose from 'mongoose';
import { z } from 'zod';

import { DBClient } from '@/db/db-client';
import MegaligaScoresCmsModel, {
    MegaligaScoresCmsType
} from '@/db/models/cms/megaliga-scores-cms';
import { editorJsContentSchema } from '@/db/models/schema.types';

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

    describe('getCmsBlockByRoundAndStage', () => {
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

            const result =
                await MegaligaScoresCmsModel.getCmsBlockByRoundAndStage(
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

    describe('setScoresCmsBlock', () => {
        const createEditorJsContent = (
            overrides: Partial<z.infer<typeof editorJsContentSchema>> = {}
        ) => ({
            time: 1723456789,
            version: '2.28.2',
            blocks: [
                {
                    id: 'block-1',
                    type: 'paragraph',
                    data: { text: 'Sample scores content' }
                }
            ],
            ...overrides
        });

        test('Should add new document with rules cms content if none exist', async () => {
            const roundNumber = 3;
            const seasonStage: SeasonStageType = 'regularSeason';
            const content = createEditorJsContent();

            await MegaligaScoresCmsModel.setScoresCmsBlock(
                roundNumber,
                seasonStage,
                content
            );

            const documents = await MegaligaScoresCmsModel.find().exec();

            expect(documents).toHaveLength(1);
            expect(documents[0]?.roundNumber).toBe(roundNumber);
            expect(documents[0]?.seasonStage).toBe(seasonStage);
            expect(documents[0]?.content).toEqual(content);
        });

        test('Should update existing document if one already exists', async () => {
            const roundNumber = 5;
            const seasonStage: SeasonStageType = 'playoff';

            await MegaligaScoresCmsModel.setScoresCmsBlock(
                roundNumber,
                seasonStage,
                createEditorJsContent()
            );

            const updatedContent = createEditorJsContent({
                blocks: [
                    {
                        id: 'block-2',
                        type: 'header',
                        data: { text: 'Updated scores content', level: 2 }
                    }
                ]
            });

            await MegaligaScoresCmsModel.setScoresCmsBlock(
                roundNumber,
                seasonStage,
                updatedContent
            );

            const documents = await MegaligaScoresCmsModel.find().exec();

            expect(documents).toHaveLength(1);
            expect(documents[0]?.content).toEqual(updatedContent);
        });

        test('Should throw error if provided content does not pass zod schema validation', async () => {
            const invalidContent = createEditorJsContent({ blocks: [] });

            await expect(
                MegaligaScoresCmsModel.setScoresCmsBlock(
                    1,
                    'playIn',
                    invalidContent as z.infer<typeof editorJsContentSchema>
                )
            ).rejects.toThrow();
        });
    });
});
