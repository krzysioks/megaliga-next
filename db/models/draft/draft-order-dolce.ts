import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';
import { UserType } from '@/db/models/user';

//DraftOrderDolce is representation of megaliga_season_draft_order_dolce of old megaliga database. Will be used to render draft order in Trybuna view for Dolce group

export const draftOrderDolceZodSchema = z.object({
    userId: objectIdSchema, // based on userId we will populate user.teamName (old team_names_id)
    draftOrder: z.number().min(0) // order of drafting in regular season draft for dolce group
});

export type DraftOrderDolceType = z.infer<typeof draftOrderDolceZodSchema>;

type PopulatedDraftOrderDolceType = Omit<DraftOrderDolceType, 'userId'> & {
    userId?: Pick<UserType, 'teamName'> & {
        _id: Types.ObjectId;
    };
};

export type PopulatedDraftOrderType =
    HydratedDocument<PopulatedDraftOrderDolceType>;

export type DraftOrderDtoType = {
    teamName: string;
    draftOrder: number;
};

interface DraftOrderDolceModelType extends Model<DraftOrderDolceType> {
    getCurrentDraftOrderUserIdByRound: (
        roundNumber: number
    ) => Promise<Types.ObjectId>;
    getDraftOrder: () => Promise<DraftOrderDtoType[]>;
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

draftOrderDolceSchema.static('getDraftOrder', async function getDraftOrder() {
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
        console.error('Error fetching draft order for dolce group:', error);
        // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
        throw error;
    }
});

const DraftOrderDolceModel = model<
    DraftOrderDolceType,
    DraftOrderDolceModelType
>('DraftOrderDolce', draftOrderDolceSchema);

export default DraftOrderDolceModel;
