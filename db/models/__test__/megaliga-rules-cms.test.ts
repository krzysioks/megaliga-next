import mongoose from 'mongoose';
import { z } from 'zod';

import { DBClient } from '@/db/db-client';
import MegaligaRulesCmsModel from '@/db/models/cms/megaliga-rules-cms';
import { editorJsContentSchema } from '@/db/models/schema.types';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

// before any test tear down clear database
beforeEach(async () => {
    await MegaligaRulesCmsModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await MegaligaRulesCmsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test MegaligaRulesCmsModel methods and static functions', () => {
    const createEditorJsContent = (
        overrides: Partial<z.infer<typeof editorJsContentSchema>> = {}
    ) => ({
        time: 1723456789,
        version: '2.28.2',
        blocks: [
            {
                id: 'block-1',
                type: 'paragraph',
                data: { text: 'Sample rules content' }
            }
        ],
        ...overrides
    });

    describe('setRulesCmsContent', () => {
        test('Should add new document with rules cms content if none exist', async () => {
            const content = createEditorJsContent();

            await MegaligaRulesCmsModel.setRulesCmsContent(content);

            const documents = await MegaligaRulesCmsModel.find().exec();

            expect(documents).toHaveLength(1);
            expect(documents[0]?.content).toEqual(content);
        });

        test('Should update existing document if one already exists', async () => {
            await MegaligaRulesCmsModel.setRulesCmsContent(
                createEditorJsContent()
            );

            const updatedContent = createEditorJsContent({
                blocks: [
                    {
                        id: 'block-2',
                        type: 'header',
                        data: { text: 'Updated rules content', level: 2 }
                    }
                ]
            });

            await MegaligaRulesCmsModel.setRulesCmsContent(updatedContent);

            const documents = await MegaligaRulesCmsModel.find().exec();

            expect(documents).toHaveLength(1);
            expect(documents[0]?.content).toEqual(updatedContent);
        });

        test('Should throw error if provided content does not pass zod schema validation', async () => {
            const invalidContent = createEditorJsContent({ blocks: [] });

            await expect(
                MegaligaRulesCmsModel.setRulesCmsContent(
                    invalidContent as z.infer<typeof editorJsContentSchema>
                )
            ).rejects.toThrow();
        });
    });
});
