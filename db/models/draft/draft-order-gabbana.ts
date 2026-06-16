import { model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//DraftOrderGabbana is representation of megaliga_season_draft_order_gabbana of old megaliga database. Will be used to render draft order in Trybuna view for Gabbana group

export const draftOrderGabbanaZodSchema = z.object({
    userId: objectIdSchema, // based on userId we will populate user.teamName (old team_names_id)
    draftOrder: z.number().min(0) // order of drafting in regular season draft for gabbana group
});

export type DraftOrderGabbanaType = z.infer<typeof draftOrderGabbanaZodSchema>;

interface DraftOrderGabbanaModelType extends Model<DraftOrderGabbanaType> {
    getCurrentDraftOrderUserIdByRound: (
        roundNumber: number
    ) => Promise<Types.ObjectId>;
}

const draftOrderGabbanaSchema = new Schema<
    DraftOrderGabbanaType,
    DraftOrderGabbanaModelType
>({
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    draftOrder: { type: Number, required: true }
});

draftOrderGabbanaSchema.static(
    'getCurrentDraftOrderUserIdByRound',
    async function getCurrentDraftOrderUserIdByRound(roundNumber: number) {
        try {
            const draftOrderDocument = await this.findOne({
                draftOrder: roundNumber
            });

            return draftOrderDocument?.userId ?? '';
        } catch (error) {
            console.error(
                'Error fetching draft order for gabbana group:',
                error
            );
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

const DraftOrderGabbanaModel = model<
    DraftOrderGabbanaType,
    DraftOrderGabbanaModelType
>('DraftOrderGabbana', draftOrderGabbanaSchema);

export default DraftOrderGabbanaModel;
