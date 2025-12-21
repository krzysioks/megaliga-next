import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, stageEnum } from '@/db/models/schema.types';

//HistoryGames collection represent in each document game played in megaliga
// We will identify all games for given team in given season by finding all documents by season, teamId and stage in historyGames collection

export const historyGamesZodSchema = z.object({
    season: objectIdSchema.optional(), // Reference to SeasonOps collection
    games: z.array(
        z.object({
            teamOne: z.object({
                teamId: objectIdSchema, // Reference to team in History.teams
                score: z.number()
            }),
            teamTwo: z.object({
                teamId: objectIdSchema, // Reference to team in History.teams
                score: z.number()
            }),
            roundNumber: z.number().min(1).max(20),
            stage: stageEnum,
            scoreDetails: objectIdSchema // Reference to HistoryGamesScoreDetails document
        })
    )
});

export type HistoryGamesType = z.infer<typeof historyGamesZodSchema>;

const historyGamesSchema = new Schema<HistoryGamesType>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps'
    },
    games: [
        {
            teamOne: {
                teamId: {
                    type: Schema.Types.ObjectId,
                    ref: 'History',
                    required: true
                },
                score: { type: Number, required: true }
            },
            teamTwo: {
                teamId: {
                    type: Schema.Types.ObjectId,
                    ref: 'History',
                    required: true
                },
                score: { type: Number, required: true }
            },
            roundNumber: { type: Number, required: true },
            stage: {
                type: String,
                enum: ['regularSeason', 'playoff', 'playIn'],
                required: true
            },
            scoreDetails: {
                type: Schema.Types.ObjectId,
                ref: 'HistoryGamesScoreDetails',
                required: true
            }
        }
    ]
});

const HistoryGamesModel = model<HistoryGamesType>(
    'HistoryGames',
    historyGamesSchema
);

export default HistoryGamesModel;
