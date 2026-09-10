import { HydratedDocument, model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import ScheduleModel, { ScheduleType } from '@/db/models/games/schedule';
import { StartingLineupType } from '@/db/models/games/starting-lineup';
import { PlayersType } from '@/db/models/players';
import {
    objectIdSchema,
    roundNumberSchema,
    teamSchema
} from '@/db/models/schema.types';
import { UserType } from '@/db/models/user';

//ScoreDetails is representation of megaliga_scores of old megaliga database. Will be used for displaying detailed scores of given match.

export const scoreDetailsZodSchema = z.object({
    scheduleId: objectIdSchema, //Reference to Schedule model, from which we will populate main scores
    roundNumber: roundNumberSchema, //needed to properly identify document for different use cases
    teamOne: teamSchema,
    teamTwo: teamSchema
});

export type ScoreDetailsType = z.infer<typeof scoreDetailsZodSchema>;

type PopulatedScoreDetailsPlayerType = Omit<
    NonNullable<ScoreDetailsType['teamOne']['players']>[number],
    'playerId'
> & {
    playerId: Pick<PlayersType, 'extraligaPlayerName'>;
};

type PopulatedScoreDetailsType = Omit<
    ScoreDetailsType,
    'scheduleId' | 'teamOne' | 'teamTwo'
> & {
    scheduleId: Pick<ScheduleType, 'userOneScore' | 'userTwoScore'>;
    teamOne: Omit<
        ScoreDetailsType['teamOne'],
        'userId' | 'players' | 'startingLineupId'
    > & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayerType[];
        startingLineupId: Pick<StartingLineupType, 'setPlays'>;
    };
    teamTwo: Omit<
        ScoreDetailsType['teamTwo'],
        'userId' | 'players' | 'startingLineupId'
    > & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayerType[];
        startingLineupId: Pick<StartingLineupType, 'setPlays'>;
    };
};
export type PopulatedFindType = HydratedDocument<PopulatedScoreDetailsType>;

type ScoreDetailsTeamPlayerDtoType = Omit<
    PopulatedScoreDetailsPlayerType,
    'playerId'
> & {
    extraligaPlayerName: PlayersType['extraligaPlayerName'];
};

type ScoreDetailsTeamDtoType = {
    teamName: PopulatedScoreDetailsType['teamOne']['userId']['teamName'];
    players: ScoreDetailsTeamPlayerDtoType[];
    trainer: PopulatedScoreDetailsType['teamOne']['trainer'];
    setPlays: PopulatedScoreDetailsType['teamOne']['startingLineupId']['setPlays'];
};

export type ScoreDetailsDtoType = {
    roundNumber: ScoreDetailsType['roundNumber'];
    teamOne: ScoreDetailsTeamDtoType;
    teamTwo: ScoreDetailsTeamDtoType;
    userOneScore: PopulatedScoreDetailsType['scheduleId']['userOneScore'];
    userTwoScore: PopulatedScoreDetailsType['scheduleId']['userTwoScore'];
};

type ScoreDetailsForHistoryTeamDtoType = {
    players: NonNullable<ScoreDetailsType['teamOne']['players']>;
    trainer: ScoreDetailsType['teamOne']['trainer'];
    setPlays: StartingLineupType['setPlays'];
};

export type ScoreDetailsForHistoryReturnType = {
    scheduleId: ScoreDetailsType['scheduleId'];
    teamOne: ScoreDetailsForHistoryTeamDtoType;
    teamTwo: ScoreDetailsForHistoryTeamDtoType;
};

type PopulatedScoreDetailsForHistoryType = Omit<
    ScoreDetailsType,
    'teamOne' | 'teamTwo'
> & {
    teamOne: Omit<ScoreDetailsType['teamOne'], 'startingLineupId'> & {
        startingLineupId?: Pick<StartingLineupType, 'setPlays'>;
    };
    teamTwo: Omit<ScoreDetailsType['teamTwo'], 'startingLineupId'> & {
        startingLineupId?: Pick<StartingLineupType, 'setPlays'>;
    };
};

interface ScoreDetailsModelType extends Model<ScoreDetailsType> {
    getScoreDetailsByScheduleAndRoundId: (
        scheduleId: string,
        roundNumber: number
    ) => Promise<ScoreDetailsDtoType>;
    getScoreDetailsForHistory: () => Promise<
        ScoreDetailsForHistoryReturnType[]
    >;
    deleteAll: () => Promise<void>;
}

const scoreDetailsSchema = new Schema<ScoreDetailsType, ScoreDetailsModelType>({
    scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule' },
    roundNumber: { type: Number, required: true },
    teamOne: {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

scoreDetailsSchema.static(
    'getScoreDetailsByScheduleAndRoundId',
    async function getScoreDetailsByScheduleIdAndRound(
        scheduleId: string,
        roundNumber: number
    ) {
        try {
            const isValidScheduleId = await ScheduleModel.exists({
                _id: scheduleId
            });

            if (!isValidScheduleId) {
                throw new Error(`Invalid scheduleId: ${scheduleId}`);
            }

            const document = (await this.findOne({
                scheduleId,
                roundNumber
            })
                .populate({
                    path: 'scheduleId',
                    select: 'userOneScore userTwoScore'
                })
                .populate({
                    path: 'teamOne.userId',
                    select: 'teamName'
                })
                .populate({
                    path: 'teamTwo.userId',
                    select: 'teamName'
                })
                .populate({
                    path: 'teamOne.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .populate({
                    path: 'teamTwo.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .populate({
                    path: 'teamOne.startingLineupId',
                    select: 'setPlays'
                })
                .populate({
                    path: 'teamTwo.startingLineupId',
                    select: 'setPlays'
                })
                .exec()) as PopulatedFindType | null;

            if (!document) {
                throw new Error(
                    `Score details for scheduleId: ${scheduleId} and roundNumber: ${roundNumber} not found`
                );
            }

            const mapTeam = (
                team: PopulatedScoreDetailsType['teamOne']
            ): ScoreDetailsTeamDtoType => ({
                teamName: team.userId?.teamName ?? '',
                players: (team.players ?? []).map(player => ({
                    heatOne: player.heatOne,
                    heatTwo: player.heatTwo,
                    heatThree: player.heatThree,
                    heatFour: player.heatFour,
                    heatFive: player.heatFive,
                    heatSix: player.heatSix,
                    heatSeven: player.heatSeven,
                    setPlay: player.setPlay,
                    comment: player.comment,
                    extraligaPlayerName:
                        player.playerId?.extraligaPlayerName ?? ''
                })),
                trainer: team.trainer,
                setPlays: team.startingLineupId?.setPlays
            });

            return {
                roundNumber: document.roundNumber,
                teamOne: mapTeam(document.teamOne),
                teamTwo: mapTeam(document.teamTwo),
                userOneScore: document.scheduleId?.userOneScore,
                userTwoScore: document.scheduleId?.userTwoScore
            };
        } catch (error) {
            console.error('Error fetching score details:', error);
            throw error;
        }
    }
);

scoreDetailsSchema.static(
    'getScoreDetailsForHistory',
    async function getScoreDetailsForHistory() {
        try {
            const documents: PopulatedScoreDetailsForHistoryType[] =
                await this.find()
                    .populate<{
                        teamOne: PopulatedScoreDetailsForHistoryType['teamOne'];
                    }>({
                        path: 'teamOne.startingLineupId',
                        select: 'setPlays'
                    })
                    .populate<{
                        teamTwo: PopulatedScoreDetailsForHistoryType['teamTwo'];
                    }>({
                        path: 'teamTwo.startingLineupId',
                        select: 'setPlays'
                    })
                    .exec();

            if (!documents.length) {
                throw new Error('Score details not found');
            }

            const mapTeam = (
                team: PopulatedScoreDetailsForHistoryType['teamOne']
            ): ScoreDetailsForHistoryTeamDtoType => {
                return {
                    players: team.players ?? [],
                    trainer: team.trainer,
                    setPlays: team.startingLineupId?.setPlays
                };
            };

            return documents.map(document => {
                return {
                    scheduleId: document.scheduleId,
                    teamOne: mapTeam(document.teamOne),
                    teamTwo: mapTeam(document.teamTwo)
                };
            });
        } catch (error) {
            console.error(
                'Error fetching score details data for history:',
                error
            );
            throw error;
        }
    }
);

scoreDetailsSchema.static('deleteAll', async function deleteAll() {
    try {
        await this.deleteMany({});
    } catch (error) {
        console.error('Error deleting all score details:', error);
        throw error;
    }
});

const ScoreDetailsModel = model<ScoreDetailsType, ScoreDetailsModelType>(
    'ScoreDetails',
    scoreDetailsSchema
);

export default ScoreDetailsModel;
