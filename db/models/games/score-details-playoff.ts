import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, teamSchema } from '@/db/models/schema.types';

//ScoreDetailsPLayoff is representation of megaliga_scores_playoff of old megaliga database. Will be used for displaying detailed scores of given match in plaoffs.

export const scoreDetailsPLayoffZodSchema = z.object({
    scheduleId: objectIdSchema, //Reference to SchedulePlayoff model, from which we will populate main scores and round number
    teamOne: teamSchema,
    teamTwo: teamSchema
});

export type ScoreDetailsPlayoffType = z.infer<
    typeof scoreDetailsPLayoffZodSchema
>;

const scoreDetailsPlayoffSchema = new Schema<ScoreDetailsPlayoffType>({
    scheduleId: { type: Schema.Types.ObjectId, ref: 'SchedulePlayoff' },
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
        startingLineupId: {
            type: Schema.Types.ObjectId,
            ref: 'StartingLineupPlayoff'
        }
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
        startingLineupId: {
            type: Schema.Types.ObjectId,
            ref: 'StartingLineupPlayoff'
        }
    }
});

const ScoreDetailsPlayoffModel = model<ScoreDetailsPlayoffType>(
    'ScoreDetailsPlayoff',
    scoreDetailsPlayoffSchema
);

export default ScoreDetailsPlayoffModel;
