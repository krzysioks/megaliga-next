// This model will represent the main collection for history view. Its document will describe:
// - which season it represents
// - from what given seson is consisted of (season and group division, playoff, play in, grand prix)
// - what type of data is stored (table with season standings, scores of each game, individual stats of players of each game)
// - in this document we will reference other collections for data for particular details of given view for given season

import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, teamReferenceSchema } from '@/db/models/schema.types';

//History reference to megaliga_history of old megaliga database, but it is completely new collection, which will support new functionalities as well as be compatible with previous seasons

// Each data stored in history (regular season, playoff, grand prix, playin, etc) will be stored in separate collections, which will be referenced in this main history document. If any of the fields empty or no ObjectID -> in given season, given segment of season was not played
export const historyZodSchema = z.object({
    season: objectIdSchema.optional(), // Reference to SeasonOps collection
    regularSeason: objectIdSchema.optional(), // Reference to regular season standings
    playoff: objectIdSchema.optional(), // Reference to playoff standings
    playIn: objectIdSchema.optional(), // Reference to play-in standings
    grandPrix: objectIdSchema.optional(), // Reference to grand prix standings
    teams: z.array(teamReferenceSchema) // List of teams participating in given season. Will be referenced in HistoryGames or HistoryGamesScoreDetails collections to identify games of given team in given season
});

export type HistoryType = z.infer<typeof historyZodSchema>;

const historySchema = new Schema<HistoryType>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps'
    },
    regularSeason: {
        type: Schema.Types.ObjectId,
        ref: 'HistoryRegularSeasonStandings'
    },
    playoff: { type: Schema.Types.ObjectId, ref: 'HistoryPlayoffStandings' },
    playIn: { type: Schema.Types.ObjectId, ref: 'HistoryPlayInStandings' },
    grandPrix: {
        type: Schema.Types.ObjectId,
        ref: 'HistoryGrandPrixStandings'
    },
    teams: [
        {
            name: { type: String, required: true },
            logoUrl: { type: String, required: true }
        }
    ]
});

const HistorysModel = model<HistoryType>('History', historySchema);

export default HistorysModel;
