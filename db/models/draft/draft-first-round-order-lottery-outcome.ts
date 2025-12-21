import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, optionalStringSchema } from '@/db/models/schema.types';

//DraftFirstRoundOrderLotteryOutcome is representation of megaliga_1round_draft_order_lottery_outcome of old megaliga database

export const draftFirstRoundOrderLotteryOutcomeZodSchema = z.object({
    one: optionalStringSchema,
    two: optionalStringSchema,
    three: optionalStringSchema,
    four: optionalStringSchema,
    five: optionalStringSchema,
    six: optionalStringSchema,
    ligueGroupsId: objectIdSchema.optional()
});

export type DraftFirstRoundOrderLotteryOutcomeType = z.infer<
    typeof draftFirstRoundOrderLotteryOutcomeZodSchema
>;

const draftFirstRoundOrderLotteryOutcomeSchema =
    new Schema<DraftFirstRoundOrderLotteryOutcomeType>({
        one: { type: String },
        two: { type: String },
        three: { type: String },
        four: { type: String },
        five: { type: String },
        six: { type: String },
        ligueGroupsId: { type: Types.ObjectId, ref: 'LigueGroups' }
    });

const DraftFirstRoundOrderLotteryOutcomeModel =
    model<DraftFirstRoundOrderLotteryOutcomeType>(
        'DraftFirstRoundOrderLotteryOutcome',
        draftFirstRoundOrderLotteryOutcomeSchema
    );

export default DraftFirstRoundOrderLotteryOutcomeModel;
