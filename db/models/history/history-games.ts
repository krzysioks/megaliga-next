import { HydratedDocument, model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import {
    roundNumberSchema,
    objectIdSchema,
    stageEnumSchema
} from '@/db/models/schema.types';
import SeasonOpsModel from '@/db/models/season-ops';

//HistoryGames collection represent in each document all games played in given season of megaliga
// We will identify all games for given team in given season by finding all documents by season, teamId and stage in historyGames collection

const STAGE_ENUM = stageEnumSchema._def.values;

export const historyGamesZodSchema = z.object({
    season: objectIdSchema, // Reference to SeasonOps collection
    games: z.array(
        z.object({
            teamOne: z.object({
                teamId: objectIdSchema, // Reference to team in HistoryTeam collection
                score: z.number().min(0)
            }),
            teamTwo: z.object({
                teamId: objectIdSchema, // Reference to team in HistoryTeam collection
                score: z.number().min(0)
            }),
            roundNumber: roundNumberSchema,
            stage: stageEnumSchema,
            scoreDetails: objectIdSchema // Reference to HistoryGamesScoreDetails document
        })
    )
});

export type HistoryGamesType = z.infer<typeof historyGamesZodSchema>;

interface TeamReturnType {
    teamName: HistoryTeamType['name'];
    logoUrl: HistoryTeamType['logoUrl'];
    score: HistoryGamesType['games'][number]['teamOne']['score'];
}

export type UserSeasonGamesByStageReturnType = {
    teamOne: TeamReturnType;
    teamTwo: TeamReturnType;
    roundNumber: HistoryGamesType['games'][number]['roundNumber'];
    scoreDetails: HistoryGamesType['games'][number]['scoreDetails'];
};

type PopulatedHistoryGamesType = Omit<HistoryGamesType, 'games'> & {
    games: (Omit<HistoryGamesType['games'][number], 'teamOne' | 'teamTwo'> & {
        teamOne: Omit<
            HistoryGamesType['games'][number]['teamOne'],
            'teamId'
        > & {
            teamId: Pick<HistoryTeamType, 'name' | 'logoUrl'>;
        };
        teamTwo: Omit<
            HistoryGamesType['games'][number]['teamTwo'],
            'teamId'
        > & {
            teamId: Pick<HistoryTeamType, 'name' | 'logoUrl'>;
        };
    })[];
};

export type PopulatedFindType = HydratedDocument<PopulatedHistoryGamesType>;

interface HistoryGamesModelType extends Model<HistoryGamesType> {
    getUserSeasonGamesByStage: (
        seasonId: string,
        userId: string,
        stage: (typeof STAGE_ENUM)[number]
    ) => Promise<UserSeasonGamesByStageReturnType[]>;
}

const historyGamesSchema = new Schema<HistoryGamesType, HistoryGamesModelType>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps',
        required: true
    },
    games: [
        {
            teamOne: {
                teamId: {
                    type: Schema.Types.ObjectId,
                    ref: 'HistoryTeam',
                    required: true
                },
                score: { type: Number, required: true }
            },
            teamTwo: {
                teamId: {
                    type: Schema.Types.ObjectId,
                    ref: 'HistoryTeam',
                    required: true
                },
                score: { type: Number, required: true }
            },
            roundNumber: { type: Number, required: true },
            stage: {
                type: String,
                enum: STAGE_ENUM,
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

historyGamesSchema.static(
    'getUserSeasonGamesByStage',
    async function getUserSeasonGamesByStage(
        seasonId: string,
        userId: string,
        stage: (typeof STAGE_ENUM)[number]
    ) {
        try {
            const isValidSeasonId = await SeasonOpsModel.exists({
                _id: seasonId
            });
            if (!isValidSeasonId) {
                throw new Error(`Invalid seasonId: ${seasonId}`);
            }

            const isValidUserId = await HistoryTeamModel.exists({
                _id: userId
            });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            const documents = (await this.findOne({
                season: seasonId,
                'games.stage': stage,
                $or: [
                    { 'games.teamOne.teamId': userId },
                    { 'games.teamTwo.teamId': userId }
                ]
            })
                .populate({
                    path: 'games.teamOne.teamId',
                    select: 'name logoUrl'
                })
                .populate({
                    path: 'games.teamTwo.teamId',
                    select: 'name logoUrl'
                })
                .exec()) as PopulatedHistoryGamesType | null;

            if (!documents || !documents.games.length) {
                throw new Error(
                    `No games found for seasonId: ${seasonId}, userId: ${userId}, stage: ${stage}`
                );
            }

            return documents.games.map(game => {
                return {
                    teamOne: {
                        teamName: game.teamOne.teamId.name,
                        logoUrl: game.teamOne.teamId.logoUrl,
                        score: game.teamOne.score
                    },
                    teamTwo: {
                        teamName: game.teamTwo.teamId.name,
                        logoUrl: game.teamTwo.teamId.logoUrl,
                        score: game.teamTwo.score
                    },
                    roundNumber: game.roundNumber,
                    scoreDetails: game?.scoreDetails?.toString() // Convert ObjectId to string
                };
            });
        } catch (error) {
            console.error(
                `Error fetching user season games by stage for seasonId: ${seasonId}, userId: ${userId}, stage: ${stage}`,
                error
            );
            throw error;
        }
    }
);

const HistoryGamesModel = model<HistoryGamesType, HistoryGamesModelType>(
    'HistoryGames',
    historyGamesSchema
);

export default HistoryGamesModel;
