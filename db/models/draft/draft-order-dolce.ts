import { model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//DraftOrderDolce is representation of megaliga_season_draft_order_dolce of old megaliga database. Will be used to render draft order in Trybuna view for Dolce group

export const draftOrderDolceZodSchema = z.object({
    userId: objectIdSchema, // based on userId we will populate user.teamName (old team_names_id)
    draftOrder: z.number().min(0) // order of drafting in regular season draft for dolce group
});

export type DraftOrderDolceType = z.infer<typeof draftOrderDolceZodSchema>;

interface DraftOrderDolceModelType extends Model<DraftOrderDolceType> {
    getCurrentDraftOrderUserIdByRound: (
        roundNumber: number
    ) => Promise<Types.ObjectId>;
}

const draftOrderDolceSchema = new Schema<
    DraftOrderDolceType,
    DraftOrderDolceModelType
>({
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    draftOrder: { type: Number, required: true }
});

draftOrderDolceSchema.static(
    'getCurrentDraftOrderUserIdByRound',
    async function getCurrentDraftOrderUserIdByRound(roundNumber: number) {
        try {
            const draftOrderDocument = await this.findOne({
                draftOrder: roundNumber
            });

            return draftOrderDocument?.userId ?? '';
        } catch (error) {
            console.error('Error fetching draft order for dolce group:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

const DraftOrderDolceModel = model<
    DraftOrderDolceType,
    DraftOrderDolceModelType
>('DraftOrderDolce', draftOrderDolceSchema);

export default DraftOrderDolceModel;
