import { model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';
import { UserType } from '@/db/models/user';

//DraftOrderPlayoff is representation of megaliga_playoff_draft_order of old megaliga database. Will be used to render playoff draft order in Trybuna view

export const draftOrderPlayoffZodSchema = z.object({
    userId: objectIdSchema, // based on userId we will populate user.teamName (old team_names_id)
    draftOrder: z.number().min(0) // order of drafting in playoff draft
});

export type DraftOrderPlayoffType = z.infer<typeof draftOrderPlayoffZodSchema>;

export type DraftOrderDtoType = {
    teamName: string;
    draftOrder: number;
};

interface DraftOrderPlayoffModelType extends Model<DraftOrderPlayoffType> {
    getCurrentDraftOrderUserIdByRound: (
        roundNumber: number
    ) => Promise<Types.ObjectId>;
    getDraftOrder: () => Promise<DraftOrderDtoType[]>;
    resetDraftOrder: () => Promise<void>;
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

draftOrderPlayoffSchema.static('getDraftOrder', async function getDraftOrder() {
    try {
        const draftOrderDocuments = await this.find()
            .sort({ draftOrder: 1 })
            .populate({
                path: 'userId',
                select: 'teamName'
            })
            .exec();

        return draftOrderDocuments.map(item => ({
            teamName: (item.userId as unknown as Pick<UserType, 'teamName'>)
                .teamName,
            draftOrder: item.draftOrder
        }));
    } catch (error) {
        console.error('Error fetching draft order for playoff:', error);
        throw error;
    }
});

draftOrderPlayoffSchema.static(
    'resetDraftOrder',
    async function resetDraftOrder() {
        try {
            await this.deleteMany({});
        } catch (error) {
            console.error('Error resetting draft order for playoff:', error);
            throw error;
        }
    }
);

const DraftOrderPlayoffModel = model<
    DraftOrderPlayoffType,
    DraftOrderPlayoffModelType
>('DraftOrderPlayoff', draftOrderPlayoffSchema);

export default DraftOrderPlayoffModel;
