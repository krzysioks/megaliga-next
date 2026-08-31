// This model will represent the main collection for history view. Its document will describe:
// - which season it represents
// - from what given seson is consisted of (season and group division, playoff, play in, grand prix)
// - what type of data is stored (table with season standings, scores of each game, individual stats of players of each game)
// - in this document we will reference other collections for data for particular details of given view for given season

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { HistoryGrandPrixStandingsType } from '@/db/models/history/history-grand-prix-standings';
import HistoryGrandPrixStandingsModel from '@/db/models/history/history-grand-prix-standings'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { HistoryPlayinStandingsType } from '@/db/models/history/history-playin-standings';
import HistoryPlayinStandingsModel from '@/db/models/history/history-playin-standings'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { HistoryPlayoffStandingsType } from '@/db/models/history/history-playoff-standings';
import HistoryPlayoffStandingsModel from '@/db/models/history/history-playoff-standings'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { HistoryRegularSeasonStandingsType } from '@/db/models/history/history-regular-season-standings';
import HistoryRegularSeasonStandingsModel from '@/db/models/history/history-regular-season-standings'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { HistoryTeamType } from '@/db/models/history/history-team';
import HistoryTeamModel from '@/db/models/history/history-team'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { objectIdSchema } from '@/db/models/schema.types';

//History reference to megaliga_history of old megaliga database, but it is completely new collection, which will support new functionalities as well as be compatible with previous seasons

// Each data stored in history (regular season, playoff, grand prix, playin, etc) will be stored in separate collections, which will be referenced in this main history document. If any of the fields empty or no ObjectID -> in given season, given segment of season was not played
export const historyZodSchema = z.object({
    season: objectIdSchema, // Reference to SeasonOps collection
    regularSeason: objectIdSchema, // Reference to regular season standings
    playoff: objectIdSchema, // Reference to playoff standings
    playIn: objectIdSchema, // Reference to play-in standings
    grandPrix: objectIdSchema // Reference to grand prix standings
});

export type HistoryType = z.infer<typeof historyZodSchema>;

// Team Return types derived from HistoryTeamType
export type HistoryTeamNameReturnType = HistoryTeamType['name'];
export type HistoryTeamCoachReturnType = HistoryTeamType['coachName'];

// Regular Season standing entry Return type derived from HistoryRegularSeasonStandingsType
export type RegularSeasonStandingReturnType = Omit<
    HistoryRegularSeasonStandingsType['standings'][number],
    'teamId'
> & {
    teamId: string;
    teamName: HistoryTeamNameReturnType;
};

// Playoff standing entry Return type derived from HistoryPlayoffStandingsType
export type PlayoffStandingReturnType = Omit<
    HistoryPlayoffStandingsType['standings'][number],
    'teamId'
> & {
    teamId: string;
    teamName: HistoryTeamNameReturnType;
};

// Play-In standing entry Return type derived from HistoryPlayinStandingsType
export type PlayInStandingReturnType = Omit<
    HistoryPlayinStandingsType['standings'][number],
    'teamId'
> & {
    teamId: string;
    teamName: HistoryTeamNameReturnType;
};

// Grand Prix standing entry Return type derived from HistoryGrandPrixStandingsType
export type GrandPrixStandingReturnType = Omit<
    HistoryGrandPrixStandingsType['standings'][number],
    'teamId'
> & {
    coachName: HistoryTeamCoachReturnType;
};

// Main return type for getHistoryBySeasonId
export type HistoryBySeasonReturnType = {
    regularSeason: RegularSeasonStandingReturnType[] | null;
    playoff: PlayoffStandingReturnType[] | null;
    playIn: PlayInStandingReturnType[] | null;
    grandPrix: GrandPrixStandingReturnType[] | null;
};

type PopulatedTeamNameRef = Pick<HistoryTeamType, 'name'> & {
    _id: Types.ObjectId;
};
type PopulatedTeamCoachRef = Pick<HistoryTeamType, 'coachName'>;

type PopulatedRegularSeasonStanding =
    HistoryRegularSeasonStandingsType['standings'][number] & {
        teamId: PopulatedTeamNameRef;
    };

type PopulatedPlayoffStanding =
    HistoryPlayoffStandingsType['standings'][number] & {
        teamId: PopulatedTeamNameRef;
    };

type PopulatedPlayInStanding =
    HistoryPlayinStandingsType['standings'][number] & {
        teamId: PopulatedTeamNameRef;
    };

type PopulatedGrandPrixStanding =
    HistoryGrandPrixStandingsType['standings'][number] & {
        teamId: PopulatedTeamCoachRef;
    };

type PopulatedHistorySegments = {
    regularSeason?: {
        standings: PopulatedRegularSeasonStanding[];
    } | null;
    playoff?: {
        standings: PopulatedPlayoffStanding[];
    } | null;
    playIn?: {
        standings: PopulatedPlayInStanding[];
    } | null;
    grandPrix?: {
        standings: PopulatedGrandPrixStanding[];
    } | null;
};

type PopulatedHistoryType = Omit<
    HistoryType,
    'regularSeason' | 'playoff' | 'playIn' | 'grandPrix'
> &
    PopulatedHistorySegments;

export type PopulatedFindType = HydratedDocument<PopulatedHistoryType>;

interface HistoryModelType extends Model<HistoryType> {
    getHistoryBySeasonId: (
        seasonId: string
    ) => Promise<HistoryBySeasonReturnType>;
    saveSeasonToHistory: (seasonId: string) => Promise<string>;
}

const historySchema = new Schema<HistoryType, HistoryModelType>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps',
        required: true
    },
    regularSeason: {
        type: Schema.Types.ObjectId,
        ref: 'HistoryRegularSeasonStandings'
    },
    playoff: { type: Schema.Types.ObjectId, ref: 'HistoryPlayoffStandings' },
    playIn: { type: Schema.Types.ObjectId, ref: 'HistoryPlayinStandings' },
    grandPrix: {
        type: Schema.Types.ObjectId,
        ref: 'HistoryGrandPrixStandings'
    }
});

historySchema.static(
    'getHistoryBySeasonId',
    async function getHistoryBySeasonId(seasonId: string) {
        try {
            const document = (await this.findOne({ season: seasonId })
                .populate({
                    path: 'regularSeason',
                    select: 'standings',
                    populate: {
                        path: 'standings.teamId',
                        select: 'name'
                    }
                })
                .populate({
                    path: 'playoff',
                    select: 'standings',
                    populate: {
                        path: 'standings.teamId',
                        select: 'name'
                    }
                })
                .populate({
                    path: 'playIn',
                    select: 'standings',
                    populate: {
                        path: 'standings.teamId',
                        select: 'name'
                    }
                })
                .populate({
                    path: 'grandPrix',
                    select: 'standings',
                    populate: {
                        path: 'standings.teamId',
                        select: 'coachName'
                    }
                })
                .exec()) as HydratedDocument<PopulatedHistoryType> | null;

            if (!document) {
                throw new Error(`History not found for seasonId: ${seasonId}`);
            }

            const mapStandingWithTeamName = (
                standing:
                    | PopulatedRegularSeasonStanding
                    | PopulatedPlayInStanding
            ) => {
                return {
                    place: standing.place,
                    played: standing.played,
                    wins: standing.wins,
                    draw: standing.draw,
                    defeat: standing.defeat,
                    balance: standing.balance,
                    points: standing.points,
                    teamId: standing.teamId?._id?.toString() ?? '',
                    teamName: standing.teamId?.name ?? ''
                };
            };

            const regularSeason = document.regularSeason?.standings
                ? document.regularSeason.standings.map(standing => {
                      return {
                          ...mapStandingWithTeamName(standing),
                          ligueGroup: standing.ligueGroup
                      };
                  })
                : null;

            const playoff = document.playoff?.standings
                ? document.playoff.standings.map(standing => {
                      return {
                          place: standing.place,
                          teamId: standing.teamId?._id?.toString() ?? '',
                          teamName: standing.teamId?.name ?? ''
                      };
                  })
                : null;

            const playIn = document.playIn?.standings
                ? document.playIn.standings.map(standing => {
                      return mapStandingWithTeamName(standing);
                  })
                : null;

            const grandPrix = document.grandPrix?.standings
                ? document.grandPrix.standings.map(standing => {
                      return {
                          place: standing.place,
                          played: standing.played,
                          points: standing.points,
                          coachName: standing.teamId?.coachName ?? ''
                      };
                  })
                : null;

            return {
                regularSeason,
                playoff,
                playIn,
                grandPrix
            };
        } catch (error) {
            console.error('Error fetching history by seasonId:', error);
            throw error;
        }
    }
);

historySchema.static(
    'saveSeasonToHistory',
    async function saveSeasonToHistory(seasonId: string) {
        try {
            const existingSeasonHistory = await this.findOne({
                season: seasonId
            }).exec();

            if (existingSeasonHistory) {
                throw new Error(
                    `Season history for seasonId: ${seasonId} already exists`
                );
            }

            const newSeasonHistory = await this.create({ season: seasonId });
            return newSeasonHistory._id.toString();
        } catch (error) {
            console.error('Error saving season to history:', error);
            throw error;
        }
    }
);

const HistoryModel = model<HistoryType, HistoryModelType>(
    'History',
    historySchema
);

export default HistoryModel;
