import { model, Model, HydratedDocument, Schema } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';
import UserModel from '@/db/models/user';

//DraftFirstRoundOrderLotteryOutcome is representation of megaliga_1round_draft_order_lottery_outcome of old megaliga database

export enum Position {
    one = 'one',
    two = 'two',
    three = 'three',
    four = 'four',
    five = 'five',
    six = 'six'
}

export const draftFirstRoundOrderLotteryOutcomeZodSchema = z.object({
    one: objectIdSchema,
    two: objectIdSchema,
    three: objectIdSchema,
    four: objectIdSchema,
    five: objectIdSchema,
    six: objectIdSchema,
    ligueGroupsId: objectIdSchema
});

export type DraftFirstRoundOrderLotteryOutcomeType = z.infer<
    typeof draftFirstRoundOrderLotteryOutcomeZodSchema
>;

type DraftFirstRoundOrderLotteryOutcomeDocumentType =
    HydratedDocument<DraftFirstRoundOrderLotteryOutcomeType> | null;

interface DraftFirstRoundOrderLotteryOutcomesMethodsType {
    setPosition: (userId: string, position: Position) => Promise<void>;
}

interface DraftFirstRoundOrderLotteryOutcomesModelType extends Model<
    DraftFirstRoundOrderLotteryOutcomeType,
    '',
    DraftFirstRoundOrderLotteryOutcomesMethodsType
> {
    getFirstRoundDraftOrderStatusByLigueGroupId: (
        ligueGroupsId: string
    ) => Promise<DraftFirstRoundOrderLotteryOutcomeDocumentType>;
    resetLotteryOutcome: () => Promise<void>;
}

const draftFirstRoundOrderLotteryOutcomeSchema = new Schema<
    DraftFirstRoundOrderLotteryOutcomeType,
    DraftFirstRoundOrderLotteryOutcomesModelType,
    DraftFirstRoundOrderLotteryOutcomesMethodsType
>({
    one: { type: String },
    two: { type: String },
    three: { type: String },
    four: { type: String },
    five: { type: String },
    six: { type: String },
    ligueGroupsId: { type: String, required: true }
});

draftFirstRoundOrderLotteryOutcomeSchema.static(
    'getFirstRoundDraftOrderStatusByLigueGroupId',
    async function getFirstRoundDraftOrderStatusByLigueGroupId(
        ligueGroupsId: string
    ) {
        try {
            return await this.findOne({
                ligueGroupsId
            }).exec();
        } catch (error) {
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            console.error(
                'Error fetching first round draft order status by ligueGroupsIs:',
                error
            );
            throw error;
        }
    }
);

draftFirstRoundOrderLotteryOutcomeSchema.static(
    'resetLotteryOutcome',
    async function resetLotteryOutcome() {
        try {
            await this.updateMany(
                {},
                {
                    $set: {
                        one: '',
                        two: '',
                        three: '',
                        four: '',
                        five: '',
                        six: '',
                        ligueGroupsId: ''
                    }
                }
            );
        } catch (error) {
            console.error('Error resetting lottery outcome:', error);
            throw error;
        }
    }
);

draftFirstRoundOrderLotteryOutcomeSchema.method(
    'setPosition',
    async function setPosition(
        userId: string,
        position: Position
    ): Promise<void> {
        try {
            if (this[position]) {
                throw new Error(`Position ${position} is already taken`);
            }

            const isUserAlreadyAssigned = Object.values(Position).some(
                pos => this[pos] === userId
            );

            if (isUserAlreadyAssigned) {
                throw new Error(`User is already assigned to a position`);
            }

            const isValidUserId = await UserModel.exists({ _id: userId });

            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            this[position] = userId;
            await this.save();
        } catch (error) {
            console.error('Error assigning position to user', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

export const DraftFirstRoundOrderLotteryOutcomeModel = model<
    DraftFirstRoundOrderLotteryOutcomeType,
    DraftFirstRoundOrderLotteryOutcomesModelType
>(
    'DraftFirstRoundOrderLotteryOutcome',
    draftFirstRoundOrderLotteryOutcomeSchema
);
