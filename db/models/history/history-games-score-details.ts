import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { teamSchema } from '@/db/models/schema.types';

//HistoryGames collection represent in each document game played in megaliga
// We will identify all games for given team in given season by finding all documents by teamName and season in historyGames collection

export const historyGamesScoreDetailsZodSchema = z.object({
    teamOne: teamSchema,
    teamTwo: teamSchema
});

export type HistoryGamesScoreDetailsType = z.infer<
    typeof historyGamesScoreDetailsZodSchema
>;

const historyGamesScoreDetails = new Schema<HistoryGamesScoreDetailsType>({
    teamOne: {
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'History',
            required: true
        },
        score: { type: Number },
        setPlays: [{ type: String }],
        players: [
            {
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players'
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
        }
    },
    teamTwo: {
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'History',
            required: true
        },
        score: { type: Number },
        setPlays: [{ type: String }],
        players: [
            {
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players'
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
        }
    }
});

const HistoryGamesScoreDetailsModel = model<HistoryGamesScoreDetailsType>(
    'HistoryGamesScoreDetails',
    historyGamesScoreDetails
);

export default HistoryGamesScoreDetailsModel;
