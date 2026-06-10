import { model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    booleanDefaultFalseSchema,
    roundNumberSchema,
    stageEnumSchema
} from '@/db/models/schema.types';

//StartingLineupStatus is representation of megaliga_starting_lineup_status of old megaliga database. Will be used for admins to lock/unlock starting lineup selection. For users will be used to define if starting lineup can be edited or not.

const STAGE_ENUM = stageEnumSchema._def.values;

export const startingLineupStatusZodSchema = z.object({
    roundNumber: roundNumberSchema,
    seasonStage: stageEnumSchema,
    isOpen: booleanDefaultFalseSchema
});

export type StartingLineupStatusType = z.infer<
    typeof startingLineupStatusZodSchema
>;

interface StartingLineupStatuspModelType extends Model<StartingLineupStatusType> {
    getStartingLineupStatusByRoundAndStage: (
        roundNumber: number,
        seasonStage: z.infer<typeof stageEnumSchema>
    ) => Promise<boolean>;
}

const startingLineupStatusSchema = new Schema<
    StartingLineupStatusType,
    StartingLineupStatuspModelType
>({
    roundNumber: { type: Number, required: true },
    seasonStage: {
        type: String,
        enum: STAGE_ENUM,
        required: true
    },
    isOpen: { type: Boolean, required: true }
});

startingLineupStatusSchema.static(
    'getStartingLineupStatusByRoundAndStage',
    async function getStartingLineupStatusByRoundAndStage(
        roundNumber: number,
        seasonStage: z.infer<typeof stageEnumSchema>
    ) {
        try {
            const document = await this.findOne({
                roundNumber,
                seasonStage
            }).exec();

            if (!document) {
                throw new Error(
                    `Failed to fetch starting lineup status for round: ${roundNumber} and season stage: ${seasonStage}`
                );
            }

            return document.isOpen;
        } catch (error) {
            console.error('Error getting starting lineup status:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

const StartingLineupStatusModel = model<
    StartingLineupStatusType,
    StartingLineupStatuspModelType
>('StartingLineupStatus', startingLineupStatusSchema);

// TODOKP: 1. static function getStartingLineupStatusByRoundAndStage(roundNumber: number, seasonStage: string) to fetch starting lineup status for given round number and season stage
// TODOKP: 2 method setStartingLineupStatus(roundNumber: number, seasonStage: string, isOpen: boolean) to set starting lineup status for given round number and season stage. Will implement later when admin panel will be implemented

export default StartingLineupStatusModel;
