import { model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    booleanDefaultFalseSchema,
    numberDefaultZeroSchema
} from '@/db/models/schema.types';

//DraftOps is representation of megaliga_draft_data of old megaliga database

export const draftOpsZodSchema = z.object({
    draftWindowOpen: booleanDefaultFalseSchema,
    draftCurrentRoundDolce: numberDefaultZeroSchema,
    draftCurrentRoundGabbana: numberDefaultZeroSchema,
    playoffDraftWindowOpen: booleanDefaultFalseSchema,
    playoffDraftCurrentRound: numberDefaultZeroSchema,
    draftRound1OrderLotteryOpen: booleanDefaultFalseSchema,
    groupLotteryOpen: booleanDefaultFalseSchema
});

export type DraftOpsType = z.infer<typeof draftOpsZodSchema>;
type DraftOpsKey = keyof DraftOpsType;

const DRAFT_OPS_FIELDS = Object.keys(
    draftOpsZodSchema.shape
) as (keyof DraftOpsType)[];

interface DraftOpsMethodsType {
    updateDraftOps: (updateData: DraftOpsType) => Promise<void>;
}

interface DraftOpsModelType extends Model<
    DraftOpsType,
    '',
    DraftOpsMethodsType
> {
    getDraftConfig: () => Promise<DraftOpsType | null>;
}

const draftOpsSchema = new Schema<
    DraftOpsType,
    DraftOpsModelType,
    DraftOpsMethodsType
>({
    draftWindowOpen: { type: Boolean, default: false },
    draftCurrentRoundDolce: { type: Number, default: 0 },
    draftCurrentRoundGabbana: { type: Number, default: 0 },
    playoffDraftWindowOpen: { type: Boolean, default: false },
    playoffDraftCurrentRound: { type: Number, default: 0 },
    draftRound1OrderLotteryOpen: { type: Boolean, default: false },
    groupLotteryOpen: { type: Boolean, default: false }
});

draftOpsSchema.static(
    'getDraftConfig',
    async function getDraftConfig(): Promise<DraftOpsType | null> {
        try {
            return await this.findOne().exec();
        } catch (error) {
            console.error('Error fetching draft config:', error);
            throw error;
        }
    }
);

draftOpsSchema.method(
    'updateDraftOps',
    async function updateDraftOps(updateData: DraftOpsType) {
        try {
            const safeUpdateData = Object.fromEntries(
                Object.entries(updateData).filter(
                    ([key, value]) =>
                        DRAFT_OPS_FIELDS.includes(key as DraftOpsKey) &&
                        value !== undefined
                )
            ) as DraftOpsType;

            this.set(safeUpdateData);
            await this.save();
        } catch (error) {
            console.error('Error updating draftOps:', error);
            throw error;
        }
    }
);

const DraftOpsModel = model<DraftOpsType, DraftOpsModelType>(
    'DraftOps',
    draftOpsSchema
);

export default DraftOpsModel;
