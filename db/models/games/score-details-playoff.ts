import { HydratedDocument, model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import SchedulePlayoffModel, {
    SchedulePlayoffType
} from '@/db/models/games/schedule-playoff';
import { StartingLineupPlayoffType } from '@/db/models/games/starting-lineup-playoff';
import { PlayersType } from '@/db/models/players';
import {
    objectIdSchema,
    roundNumberSchema,
    teamSchema
} from '@/db/models/schema.types';
import { UserType } from '@/db/models/user';

//ScoreDetailsPLayoff is representation of megaliga_scores_playoff of old megaliga database. Will be used for displaying detailed scores of given match in plaoffs.

export const scoreDetailsPLayoffZodSchema = z.object({
    scheduleId: objectIdSchema, //Reference to SchedulePlayoff model, from which we will populate main scores and round number
    roundNumber: roundNumberSchema, //needed to properly identify document for different use cases
    teamOne: teamSchema,
    teamTwo: teamSchema
});

export type ScoreDetailsPlayoffType = z.infer<
    typeof scoreDetailsPLayoffZodSchema
>;

type PopulatedScoreDetailsPlayoffPlayerType = Omit<
    NonNullable<ScoreDetailsPlayoffType['teamOne']['players']>[number],
    'playerId'
> & {
    playerId: Pick<PlayersType, 'extraligaPlayerName'>;
};

type PopulatedScoreDetailsPlayoffType = Omit<
    ScoreDetailsPlayoffType,
    'scheduleId' | 'teamOne' | 'teamTwo'
> & {
    scheduleId: Pick<SchedulePlayoffType, 'userOneScore' | 'userTwoScore'>;
    teamOne: Omit<
        ScoreDetailsPlayoffType['teamOne'],
        'userId' | 'players' | 'startingLineupId'
    > & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayoffPlayerType[];
        startingLineupId: Pick<StartingLineupPlayoffType, 'setPlays'>;
    };
    teamTwo: Omit<
        ScoreDetailsPlayoffType['teamTwo'],
        'userId' | 'players' | 'startingLineupId'
    > & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayoffPlayerType[];
        startingLineupId: Pick<StartingLineupPlayoffType, 'setPlays'>;
    };
};

export type PopulatedFindType =
    HydratedDocument<PopulatedScoreDetailsPlayoffType>;

type ScoreDetailsPlayoffTeamPlayerDtoType = Omit<
    PopulatedScoreDetailsPlayoffPlayerType,
    'playerId'
> & {
    extraligaPlayerName: PlayersType['extraligaPlayerName'];
};

type ScoreDetailsPlayoffTeamDtoType = {
    teamName: PopulatedScoreDetailsPlayoffType['teamOne']['userId']['teamName'];
    players: ScoreDetailsPlayoffTeamPlayerDtoType[];
    trainer: PopulatedScoreDetailsPlayoffType['teamOne']['trainer'];
    setPlays: PopulatedScoreDetailsPlayoffType['teamOne']['startingLineupId']['setPlays'];
};

export type ScoreDetailsPlayoffDtoType = {
    roundNumber: ScoreDetailsPlayoffType['roundNumber'];
    teamOne: ScoreDetailsPlayoffTeamDtoType;
    teamTwo: ScoreDetailsPlayoffTeamDtoType;
    userOneScore: PopulatedScoreDetailsPlayoffType['scheduleId']['userOneScore'];
    userTwoScore: PopulatedScoreDetailsPlayoffType['scheduleId']['userTwoScore'];
};

interface ScoreDetailsPlayoffModelType extends Model<ScoreDetailsPlayoffType> {
    getScoreDetailsByScheduleAndRoundId: (
        scheduleId: string,
        roundNumber: number
    ) => Promise<ScoreDetailsPlayoffDtoType>;
}

const scoreDetailsPlayoffSchema = new Schema<
    ScoreDetailsPlayoffType,
    ScoreDetailsPlayoffModelType
>({
    scheduleId: { type: Schema.Types.ObjectId, ref: 'SchedulePlayoff' },
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
        startingLineupId: {
            type: Schema.Types.ObjectId,
            ref: 'StartingLineupPlayoff'
        }
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
        startingLineupId: {
            type: Schema.Types.ObjectId,
            ref: 'StartingLineupPlayoff'
        }
    }
});

scoreDetailsPlayoffSchema.static(
    'getScoreDetailsByScheduleAndRoundId',
    async function getScoreDetailsByScheduleIdAndRound(
        scheduleId: string,
        roundNumber: number
    ) {
        try {
            const isValidScheduleId = await SchedulePlayoffModel.exists({
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
                team: PopulatedScoreDetailsPlayoffType['teamOne']
            ): ScoreDetailsPlayoffTeamDtoType => ({
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
            console.error('Error fetching score details playoff:', error);
            throw error;
        }
    }
);

const ScoreDetailsPlayoffModel = model<
    ScoreDetailsPlayoffType,
    ScoreDetailsPlayoffModelType
>('ScoreDetailsPlayoff', scoreDetailsPlayoffSchema);

export default ScoreDetailsPlayoffModel;
