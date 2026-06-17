import { model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//DraftOrderPlayoff is representation of megaliga_playoff_draft_order of old megaliga database. Will be used to render playoff draft order in Trybuna view

export const draftOrderPlayoffZodSchema = z.object({
    userId: objectIdSchema, // based on userId we will populate user.teamName (old team_names_id)
    draftOrder: z.number().min(0) // order of drafting in playoff draft
});

export type DraftOrderPlayoffType = z.infer<typeof draftOrderPlayoffZodSchema>;

interface DraftOrderPlayoffModelType extends Model<DraftOrderPlayoffType> {
    getCurrentDraftOrderUserIdByRound: (
        roundNumber: number
    ) => Promise<Types.ObjectId>;
}

const draftOrderPlayoffSchema = new Schema<
    DraftOrderPlayoffType,
    DraftOrderPlayoffModelType
>({
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    draftOrder: { type: Number, required: true }
});

draftOrderPlayoffSchema.static(
    'getCurrentDraftOrderUserIdByRound',
    async function getCurrentDraftOrderUserIdByRound(roundNumber: number) {
        try {
            const draftOrderDocument = await this.findOne({
                draftOrder: roundNumber
            });

            return draftOrderDocument?.userId ?? '';
        } catch (error) {
            console.error('Error fetching draft order for playoff:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

const DraftOrderPlayoffModel = model<
    DraftOrderPlayoffType,
    DraftOrderPlayoffModelType
>('DraftOrderPlayoff', draftOrderPlayoffSchema);

export default DraftOrderPlayoffModel;
