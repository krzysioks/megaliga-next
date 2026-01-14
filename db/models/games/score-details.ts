import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, teamSchema } from '@/db/models/schema.types';

//ScoreDetails is representation of megaliga_scores of old megaliga database. Will be used for displaying detailed scores of given match.

export const scoreDetailsZodSchema = z.object({
    scheduleId: objectIdSchema, //Reference to Schedule model, from which we will populate main scores and round number
    teamOne: teamSchema,
    teamTwo: teamSchema
});

export type ScoreDetailsType = z.infer<typeof scoreDetailsZodSchema>;

const scoreDetailsSchema = new Schema<ScoreDetailsType>({
    scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule' },
    teamOne: {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        score: { type: Number },
        players: [
            {
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players',
                    required: true
                },
                heatOne: { type: Number },
                heatTwo: { type: Number },
                heatThree: { type: Number },
                heatFour: { type: Number },
                heatFive: { type: Number },
                heatSix: { type: Number },
                heatSeven: { type: Number },
                setPlay: { type: Number },
                comment: { type: String }
            }
        ],
        trainer: {
            heatOne: { type: Number },
            heatTwo: { type: Number },
            heatThree: { type: Number },
            heatFour: { type: Number },
            heatFive: { type: Number },
            heatSix: { type: Number },
            heatSeven: { type: Number },
            setPlay: { type: Number },
            comment: { type: String }
        },
        startingLineupId: { type: Schema.Types.ObjectId, ref: 'StartingLineup' }
    },
    teamTwo: {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        score: { type: Number },
        players: [
            {
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players',
                    required: true
                },
                heatOne: { type: Number },
                heatTwo: { type: Number },
                heatThree: { type: Number },
                heatFour: { type: Number },
                heatFive: { type: Number },
                heatSix: { type: Number },
                heatSeven: { type: Number },
                setPlay: { type: Number },
                comment: { type: String }
            }
        ],
        trainer: {
            heatOne: { type: Number },
            heatTwo: { type: Number },
            heatThree: { type: Number },
            heatFour: { type: Number },
            heatFive: { type: Number },
            heatSix: { type: Number },
            heatSeven: { type: Number },
            setPlay: { type: Number },
            comment: { type: String }
        },
        startingLineupId: { type: Schema.Types.ObjectId, ref: 'StartingLineup' }
    }
});

const ScoreDetailsModel = model<ScoreDetailsType>(
    'ScoreDetails',
    scoreDetailsSchema
);

export default ScoreDetailsModel;
