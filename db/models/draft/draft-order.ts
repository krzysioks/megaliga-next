import { model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    booleanDefaultFalseSchema
} from '@/db/models/schema.types';

//DraftOrder is representation of megaliga_draft_order of old megaliga database. Will be used for lottery of drafting positions
export const draftOrderZodSchema = z.object({
    ligueGroupsId: objectIdSchema, //field will be used to know to which document save selected position by user. Either to dolce or gabbana
    spot: z.array(
        z.object({
            positionNo: z.number().min(1).max(6),
            isSelected: booleanDefaultFalseSchema
        })
    )
});

export type DraftOrderType = z.infer<typeof draftOrderZodSchema>;

interface DraftOrderModelType extends Model<DraftOrderType> {
    getAvailablePositionsByLigueGroup: (
        ligueGroupsId: string
    ) => Promise<number>;
}

const draftOrderSchema = new Schema<DraftOrderType, DraftOrderModelType>({
    ligueGroupsId: { type: String, required: true },
    spot: [
        {
            positionNo: { type: Number, required: true },
            isSelected: { type: Boolean, default: false }
        }
    ]
});

draftOrderSchema.static(
    'getAvailablePositionsByLigueGroup',
    async function getAvailablePositionsByLigueGroup(ligueGroupsId: string) {
        try {
            const document = await this.findOne({
                ligueGroupsId
            }).exec();

            if (!document) {
                throw new Error(
                    `Draft order document not found for ligueGroupsId: ${ligueGroupsId}`
                );
            }

            const availablePositions = document.spot.filter(
                ({ isSelected }) => !isSelected
            ).length;

            return availablePositions;
        } catch (error) {
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            console.error(
                'Error fetching number of available positions by ligueGroupsIs:',
                error
            );
            throw error;
        }
    }
);

export const DraftOrderModel = model<DraftOrderType, DraftOrderModelType>(
    'DraftOrder',
    draftOrderSchema
);
