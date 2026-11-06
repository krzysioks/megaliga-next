import type {
    CalculationTeamType,
    CalculateMatchScoresReturnType,
    GetSetPlaysDetailsReturnType
} from '@/db/db.types';
import type {
    PlayerScoresType,
    PlayerScoresInputType
} from '@/db/models/schema.types';

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    MIN_PLAYOFF_ROUND,
    MAX_PLAYOFF_ROUND,
    PLAYOFF_MATCH_COUNT,
    STARTING_LINEUP_PLAYER_COUNT,
    STARTING_LINEUP_POSITION_KEYS
} from '@/db/db.constants';
import { areRoundScoresComplete, getSetPlaysDetails } from '@/db/db.utils';
import SchedulePlayoffModel, {
    SchedulePlayoffType
} from '@/db/models/games/schedule-playoff';
import SetPlayPlayoffDataModel from '@/db/models/games/set-play-playoff-data';
import {
    StartingLineupPlayoffPlayersByRoundReturnType,
    StartingLineupPlayoffType
} from '@/db/models/games/starting-lineup-playoff';
import PlayersModel, { PlayersType } from '@/db/models/players';
import {
    HistoryPlayerType,
    historyPlayerSchema,
    playerScoresZodSchema,
    playerSchema,
    trainerSchema,
    objectIdSchema,
    roundNumberSchema,
    teamSchema,
    SetPlayEnumType
} from '@/db/models/schema.types';
import SeasonOpsModel from '@/db/models/season-ops';
import { setPlayPayloadZodSchema } from '@/db/models/set-play-payload.schema';
import UserModel, { UserType } from '@/db/models/user';
import { calculateMatchScores } from '@/db/score-calculation.utils';

//ScoreDetailsPLayoff is representation of megaliga_scores_playoff of old megaliga database. Will be used for displaying detailed scores of given match in plaoffs.

export const scoreDetailsPlayoffZodSchema = z.object({
    scheduleId: objectIdSchema, //Reference to SchedulePlayoff model, from which we will populate main scores and round number
    roundNumber: roundNumberSchema, //needed to properly identify document for different use cases
    teamOne: teamSchema,
    teamTwo: teamSchema
});

export type ScoreDetailsPlayoffType = z.infer<
    typeof scoreDetailsPlayoffZodSchema
>;

export type ScoreDetailsPlayoffInputType = z.input<
    typeof scoreDetailsPlayoffZodSchema
>;

type PopulatedScoreDetailsPlayoffPlayerType = Omit<
    NonNullable<ScoreDetailsPlayoffType['teamOne']['players']>[number],
    'playerId'
> & {
    playerId: Pick<PlayersType, 'extraligaPlayerName'>;
};

type PopulatedScoreDetailsPlayoffStartingLineupType = {
    _id: Types.ObjectId;
    roles: StartingLineupPlayoffType['roles'];
};

type PopulatedScoreDetailsPlayoffTeamWithLineupType = Omit<
    ScoreDetailsPlayoffType['teamOne'],
    'startingLineupId'
> & {
    startingLineupId?: PopulatedScoreDetailsPlayoffStartingLineupType | null;
};

type PopulatedScoreDetailsPlayoffType = Omit<
    ScoreDetailsPlayoffType,
    'scheduleId' | 'teamOne' | 'teamTwo'
> & {
    scheduleId: Pick<SchedulePlayoffType, 'userOneScore' | 'userTwoScore'>;
    teamOne: Omit<
        PopulatedScoreDetailsPlayoffTeamWithLineupType,
        'userId' | 'players'
    > & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayoffPlayerType[];
    };
    teamTwo: Omit<
        PopulatedScoreDetailsPlayoffTeamWithLineupType,
        'userId' | 'players'
    > & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayoffPlayerType[];
    };
};

export type PopulatedFindType =
    HydratedDocument<PopulatedScoreDetailsPlayoffType>;

type ScoreDetailsPlayoffTeamPlayerReturnType = Omit<
    PopulatedScoreDetailsPlayoffPlayerType,
    'playerId'
> & {
    extraligaPlayerName: PlayersType['extraligaPlayerName'];
};

type ScoreDetailsPlayoffTeamReturnType = GetSetPlaysDetailsReturnType & {
    teamName: PopulatedScoreDetailsPlayoffType['teamOne']['userId']['teamName'];
    players: ScoreDetailsPlayoffTeamPlayerReturnType[];
    trainer: PopulatedScoreDetailsPlayoffType['teamOne']['trainer'];
};

export type ScoreDetailsPlayoffReturnType = {
    roundNumber: ScoreDetailsPlayoffType['roundNumber'];
    teamOne: ScoreDetailsPlayoffTeamReturnType;
    teamTwo: ScoreDetailsPlayoffTeamReturnType;
    userOneScore: PopulatedScoreDetailsPlayoffType['scheduleId']['userOneScore'];
    userTwoScore: PopulatedScoreDetailsPlayoffType['scheduleId']['userTwoScore'];
};

type ScoreDetailsPlayoffForHistoryTeamReturnType = {
    players: HistoryPlayerType[];
    trainer: ScoreDetailsPlayoffType['teamOne']['trainer'];
    setPlays: string;
};

export type ScoreDetailsPlayoffForHistoryReturnType = {
    scheduleId: ScoreDetailsPlayoffType['scheduleId'];
    teamOne: ScoreDetailsPlayoffForHistoryTeamReturnType;
    teamTwo: ScoreDetailsPlayoffForHistoryTeamReturnType;
};

type PopulatedScoreDetailsPlayoffForHistoryType = Omit<
    ScoreDetailsPlayoffType,
    'teamOne' | 'teamTwo'
> & {
    teamOne: PopulatedScoreDetailsPlayoffTeamWithLineupType;
    teamTwo: PopulatedScoreDetailsPlayoffTeamWithLineupType;
};

type PopulatedScoreDetailsPlayoffForHistoryFindType =
    HydratedDocument<PopulatedScoreDetailsPlayoffForHistoryType>;

type ScoreDetailsPlayoffTeamType = 'teamOne' | 'teamTwo';

export type PlayerScoreDetailsPlayoffReturnType = {
    scoreDetailsId: string | null;
    teamType: ScoreDetailsPlayoffTeamType | null;
    playerScoreDetails: PlayerScoresType;
};

export type SavePlayerScoreDetailsPlayoffReturnType = {
    success: boolean;
};

interface ScoreDetailsPlayoffModelType extends Model<ScoreDetailsPlayoffType> {
    getScoreDetailsByScheduleAndRoundId: (
        scheduleId: string,
        roundNumber: number
    ) => Promise<ScoreDetailsPlayoffReturnType>;
    getScoreDetailsForHistory: () => Promise<
        ScoreDetailsPlayoffForHistoryReturnType[]
    >;
    getPlayerScoreDetailsByRoundAndUserId: (
        roundNumber: number,
        userId: string,
        playerId: string
    ) => Promise<PlayerScoreDetailsPlayoffReturnType>;
    savePlayerScoreDetails: (
        playerData: StartingLineupPlayoffPlayersByRoundReturnType,
        roundNumber: number,
        playerScore: PlayerScoresInputType
    ) => Promise<SavePlayerScoreDetailsPlayoffReturnType>;
    calculateScoresByRound: (roundNumber: number) => Promise<void>;
    isScoreCalculationsEnabled: (roundNumber: number) => Promise<boolean>;
    deleteAll: () => Promise<void>;
}

type PopulatedScoreDetailsPlayoffCalculationTeamType = Omit<
    ScoreDetailsPlayoffType['teamOne'],
    'startingLineupId'
> & {
    startingLineupId:
        | (StartingLineupPlayoffType & { _id: Types.ObjectId })
        | null;
};

type PopulatedScoreDetailsPlayoffCalculationType = Omit<
    ScoreDetailsPlayoffType,
    'scheduleId' | 'teamOne' | 'teamTwo'
> & {
    scheduleId: (SchedulePlayoffType & { _id: Types.ObjectId }) | null;
    teamOne: PopulatedScoreDetailsPlayoffCalculationTeamType;
    teamTwo: PopulatedScoreDetailsPlayoffCalculationTeamType;
};

type PopulatedScoreDetailsPlayoffCalculationFindType =
    HydratedDocument<PopulatedScoreDetailsPlayoffCalculationType>;

type ScoreDetailsPlayoffRoundCalculationType = {
    document: PopulatedScoreDetailsPlayoffCalculationFindType;
    result: CalculateMatchScoresReturnType;
};

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
                heatOne: {
                    // For all heats: undefined means not submitted; null means saved with no start.
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatTwo: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatThree: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatFour: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatFive: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatSix: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatSeven: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
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
                heatOne: {
                    // For all heats: undefined means not submitted; null means saved with no start.
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatTwo: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatThree: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatFour: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatFive: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatSix: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatSeven: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
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
    async function getScoreDetailsByScheduleAndRoundId(
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

            const document: PopulatedFindType | null = await this.findOne({
                scheduleId,
                roundNumber
            })
                .populate<PopulatedFindType>({
                    path: 'scheduleId',
                    select: 'userOneScore userTwoScore'
                })
                .populate<PopulatedFindType>({
                    path: 'teamOne.userId',
                    select: 'teamName'
                })
                .populate<PopulatedFindType>({
                    path: 'teamTwo.userId',
                    select: 'teamName'
                })
                .populate<PopulatedFindType>({
                    path: 'teamOne.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .populate<PopulatedFindType>({
                    path: 'teamTwo.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .populate<PopulatedFindType>({
                    path: 'teamOne.startingLineupId teamTwo.startingLineupId',
                    select: 'roles'
                })
                .exec();

            if (!document) {
                throw new Error(
                    `Score details for scheduleId: ${scheduleId} and roundNumber: ${roundNumber} not found`
                );
            }

            const mapTeam = async (
                team: PopulatedScoreDetailsPlayoffType['teamOne']
            ): Promise<ScoreDetailsPlayoffTeamReturnType> => {
                const { setPlayList } = team.startingLineupId
                    ? await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                          team.startingLineupId._id.toString()
                      )
                    : { setPlayList: [] };
                const setPlaysDetails = await getSetPlaysDetails({
                    setPlayList,
                    roles: team.startingLineupId?.roles
                });

                return {
                    teamName: team.userId?.teamName ?? '',
                    players: (team.players ?? []).map(player => {
                        return {
                            ...playerSchema
                                .omit({ playerId: true })
                                .parse(player),
                            extraligaPlayerName:
                                player.playerId?.extraligaPlayerName ?? ''
                        };
                    }),
                    trainer: team.trainer
                        ? trainerSchema.parse(team.trainer)
                        : undefined,
                    ...setPlaysDetails
                };
            };

            const [teamOne, teamTwo] = await Promise.all([
                mapTeam(document.teamOne),
                mapTeam(document.teamTwo)
            ]);

            return {
                roundNumber: document.roundNumber,
                teamOne,
                teamTwo,
                userOneScore: document.scheduleId?.userOneScore,
                userTwoScore: document.scheduleId?.userTwoScore
            };
        } catch (error) {
            console.error('Error fetching score details playoff:', error);
            throw error;
        }
    }
);

scoreDetailsPlayoffSchema.static(
    'getScoreDetailsForHistory',
    async function getScoreDetailsForHistory() {
        try {
            const documents: PopulatedScoreDetailsPlayoffForHistoryFindType[] =
                await this.find()
                    .populate<PopulatedScoreDetailsPlayoffForHistoryFindType>({
                        path: 'teamOne.startingLineupId teamTwo.startingLineupId',
                        select: 'roles'
                    })
                    .exec();

            if (!documents.length) {
                throw new Error('Score details not found');
            }

            const mapTeam = async (
                team: PopulatedScoreDetailsPlayoffTeamWithLineupType
            ): Promise<ScoreDetailsPlayoffForHistoryTeamReturnType> => {
                const { setPlayList } = team.startingLineupId
                    ? await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                          team.startingLineupId._id.toString()
                      )
                    : { setPlayList: [] };
                const setPlaysDetails = await getSetPlaysDetails({
                    setPlayList,
                    roles: team.startingLineupId?.roles
                });

                return {
                    players: (team.players ?? []).map(player => {
                        return historyPlayerSchema.parse({
                            playerId: player.playerId?.toString(),
                            heatOne: player.heatOne.value,
                            heatTwo: player.heatTwo.value,
                            heatThree: player.heatThree.value,
                            heatFour: player.heatFour.value,
                            heatFive: player.heatFive.value,
                            heatSix: player.heatSix.value,
                            heatSeven: player.heatSeven.value,
                            setPlay: player.setPlay,
                            comment: player.comment
                        });
                    }),
                    trainer: team.trainer
                        ? trainerSchema.parse(team.trainer)
                        : undefined,
                    setPlays: setPlaysDetails.setPlayDescriptions
                };
            };

            return await Promise.all(
                documents.map(async document => {
                    const [teamOne, teamTwo] = await Promise.all([
                        mapTeam(document.teamOne),
                        mapTeam(document.teamTwo)
                    ]);

                    return {
                        scheduleId: document.scheduleId,
                        teamOne,
                        teamTwo
                    };
                })
            );
        } catch (error) {
            console.error(
                'Error fetching score details playoff data for history:',
                error
            );
            throw error;
        }
    }
);

scoreDetailsPlayoffSchema.static('deleteAll', async function deleteAll() {
    try {
        await this.deleteMany({});
    } catch (error) {
        console.error('Error deleting all score details playoff:', error);
        throw error;
    }
});

scoreDetailsPlayoffSchema.static(
    'getPlayerScoreDetailsByRoundAndUserId',
    async function getPlayerScoreDetailsByRoundAndUserId(
        roundNumber: number,
        userId: string,
        playerId: string
    ) {
        try {
            if (roundNumber < 1 || roundNumber > 4) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between 1 and 4`
                );
            }

            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            const isValidPlayerId = await PlayersModel.exists({
                _id: playerId
            });
            if (!isValidPlayerId) {
                throw new Error(`Invalid playerId: ${playerId}`);
            }

            const document = await this.findOne({
                roundNumber,
                $or: [
                    { 'teamOne.userId': userId },
                    { 'teamTwo.userId': userId }
                ]
            }).exec();

            if (!document) {
                return {
                    scoreDetailsId: null,
                    teamType: null,
                    playerScoreDetails: playerScoresZodSchema.parse({})
                };
            }

            const teamType: ScoreDetailsPlayoffTeamType =
                document.teamOne.userId?.toString() === userId
                    ? 'teamOne'
                    : 'teamTwo';

            const playerEntry = document[teamType].players?.find(
                player => player.playerId?.toString() === playerId
            );

            const playerScoreDetails: PlayerScoresType =
                playerScoresZodSchema.parse(playerEntry ?? {});

            return {
                scoreDetailsId: document._id.toString(),
                teamType,
                playerScoreDetails
            };
        } catch (error) {
            console.error(
                'Error fetching playoff player score details:',
                error
            );
            throw error;
        }
    }
);

scoreDetailsPlayoffSchema.static(
    'savePlayerScoreDetails',
    async function savePlayerScoreDetails(
        playerData: StartingLineupPlayoffPlayersByRoundReturnType,
        roundNumber: number,
        playerScore: PlayerScoresInputType
    ) {
        try {
            const normalizedPlayerScore =
                playerScoresZodSchema.parse(playerScore);

            for (let index = 0; index < playerData.userId.length; index++) {
                const userId = playerData.userId[index];
                const startingLineupId = playerData.startingLineupId[index];

                const schedule =
                    await SchedulePlayoffModel.getScheduleIdByUserAndRoundNumber(
                        userId ?? '',
                        roundNumber
                    );

                if (!schedule) {
                    throw new Error(
                        `Schedule not found for userId: ${userId} and roundNumber: ${roundNumber}`
                    );
                }

                const teamKey: ScoreDetailsPlayoffTeamType =
                    schedule.userOneId === userId ? 'teamOne' : 'teamTwo';

                const document = await this.findOne({
                    scheduleId: schedule.scheduleId,
                    roundNumber
                }).exec();

                const players = document?.[teamKey].players ?? [];
                const existingPlayerIndex = players.findIndex(player => {
                    return player.playerId?.toString() === playerData.playerId;
                });

                if (existingPlayerIndex >= 0) {
                    players[existingPlayerIndex] = {
                        ...players[existingPlayerIndex],
                        playerId: playerData.playerId,
                        ...normalizedPlayerScore
                    };
                } else {
                    players.push(
                        playerSchema.parse({
                            playerId: playerData.playerId,
                            ...normalizedPlayerScore
                        })
                    );
                }

                await this.updateOne(
                    { scheduleId: schedule.scheduleId, roundNumber },
                    {
                        $set: {
                            [`${teamKey}.userId`]: userId,
                            [`${teamKey}.startingLineupId`]: startingLineupId,
                            [`${teamKey}.players`]: players
                        }
                    },
                    { upsert: true }
                );
            }

            return { success: true };
        } catch (error) {
            console.error('Error saving playoff player score details:', error);
            throw error;
        }
    }
);

scoreDetailsPlayoffSchema.static(
    'isScoreCalculationsEnabled',
    async function isScoreCalculationsEnabled(roundNumber: number) {
        try {
            if (
                roundNumber < MIN_PLAYOFF_ROUND ||
                roundNumber > MAX_PLAYOFF_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_PLAYOFF_ROUND} and ${MAX_PLAYOFF_ROUND}`
                );
            }
            const documents = await this.find({ roundNumber }).exec();
            return areRoundScoresComplete({
                documents,
                minimumMatchCount: PLAYOFF_MATCH_COUNT
            });
        } catch (error) {
            console.error(
                'Error checking playoff score calculations status:',
                error
            );
            throw error;
        }
    }
);

scoreDetailsPlayoffSchema.static(
    'calculateScoresByRound',
    async function calculateScoresByRound(roundNumber: number) {
        try {
            if (
                roundNumber < MIN_PLAYOFF_ROUND ||
                roundNumber > MAX_PLAYOFF_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_PLAYOFF_ROUND} and ${MAX_PLAYOFF_ROUND}`
                );
            }
            const documents: PopulatedScoreDetailsPlayoffCalculationFindType[] =
                await this.find({ roundNumber })
                    .populate<PopulatedScoreDetailsPlayoffCalculationFindType>({
                        path: 'scheduleId',
                        select: 'roundNumber userOneId userTwoId'
                    })
                    .populate<PopulatedScoreDetailsPlayoffCalculationFindType>({
                        path: 'teamOne.startingLineupId',
                        select: 'userId roundNumber playerOne playerTwo playerThree playerFour playerFive roles'
                    })
                    .populate<PopulatedScoreDetailsPlayoffCalculationFindType>({
                        path: 'teamTwo.startingLineupId',
                        select: 'userId roundNumber playerOne playerTwo playerThree playerFour playerFive roles'
                    })
                    .exec();
            if (
                !areRoundScoresComplete({
                    documents,
                    minimumMatchCount: PLAYOFF_MATCH_COUNT
                })
            ) {
                throw new Error(
                    `Score details are incomplete for round: ${roundNumber}`
                );
            }

            const currentSeason = await SeasonOpsModel.findOne({
                isCurrentSeason: true
            }).exec();

            if (!currentSeason) {
                throw new Error('Current season not found');
            }

            const scheduleIds = new Set(
                documents.map(document => document.scheduleId?._id.toString())
            );

            if (
                documents.length !== PLAYOFF_MATCH_COUNT ||
                scheduleIds.size !== documents.length ||
                (await SchedulePlayoffModel.countDocuments({ roundNumber })) !==
                    documents.length
            ) {
                throw new Error(
                    `Schedule coverage is incomplete for round: ${roundNumber}`
                );
            }

            const calculations: ScoreDetailsPlayoffRoundCalculationType[] = [];
            for (const document of documents) {
                const schedule = document.scheduleId;
                if (
                    !schedule ||
                    schedule.roundNumber !== roundNumber ||
                    schedule.userOneId?.toString() !==
                        document.teamOne.userId?.toString() ||
                    schedule.userTwoId?.toString() !==
                        document.teamTwo.userId?.toString()
                ) {
                    throw new Error(
                        `Invalid schedule for score details: ${document._id}`
                    );
                }
                const teams: CalculationTeamType[] = [];
                for (const team of [document.teamOne, document.teamTwo]) {
                    const startingLineup = team.startingLineupId;
                    const userId = team.userId?.toString();
                    if (
                        !startingLineup ||
                        startingLineup.roundNumber !== roundNumber ||
                        startingLineup.userId?.toString() !== userId
                    ) {
                        throw new Error(
                            `Invalid starting lineup for user: ${userId}`
                        );
                    }
                    const positions = Object.fromEntries(
                        STARTING_LINEUP_POSITION_KEYS.map(key => {
                            return [key, startingLineup[key]?.toString()];
                        })
                    );
                    const positionIds = STARTING_LINEUP_POSITION_KEYS.map(key => {
                        return startingLineup[key]?.toString();
                    });
                    const playerScores = team.players!;
                    if (
                        new Set(positionIds).size !==
                            STARTING_LINEUP_PLAYER_COUNT ||
                        positionIds.some(id => {
                            return (
                                !id ||
                                !playerScores.some(
                                    player => player.playerId?.toString() === id
                                )
                            );
                        })
                    ) {
                        throw new Error(
                            `Starting lineup players do not match score details for user: ${userId}`
                        );
                    }
                    const { setPlayList } =
                        await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                            startingLineup._id.toString()
                        );
                    for (const setPlay of setPlayList) {
                        setPlayPayloadZodSchema.parse(setPlay);
                    }
                    const replacementIds = setPlayList.flatMap(setPlay => {
                        return setPlay.type === SetPlayEnumType.Rezerwa ||
                            setPlay.type === SetPlayEnumType.RezerwaGielda ||
                            (setPlay.type === SetPlayEnumType.Awatar &&
                                !setPlay.adminData?.isDisabled)
                            ? [setPlay.userData.playerId]
                            : [];
                    });
                    const players = await PlayersModel.find({
                        _id: { $in: [...positionIds, ...replacementIds] }
                    })
                        .select('isJunior')
                        .exec();
                    const playerMetadata = players.map(player => {
                        return {
                            playerId: player._id.toString(),
                            isJunior: player.isJunior
                        };
                    });
                    const mappedPlayers = playerScores.map(player => {
                        const playerId = player.playerId!.toString();
                        const metadata = playerMetadata.find(
                            item => item.playerId === playerId
                        );
                        if (!metadata) {
                            throw new Error(`Missing player: ${playerId}`);
                        }
                        return {
                            ...playerScoresZodSchema.parse(player),
                            ...metadata,
                            setPlay: 0,
                            comment: ''
                        };
                    });
                    teams.push({
                        players: mappedPlayers,
                        startingLineup: {
                            playerOne: positions.playerOne,
                            playerTwo: positions.playerTwo,
                            playerThree: positions.playerThree,
                            playerFour: positions.playerFour,
                            playerFive: positions.playerFive,
                            roles: {
                                pn: {
                                    playerId:
                                        startingLineup.roles.pn.playerId.toString(),
                                    isDisabled:
                                        startingLineup.roles.pn.isDisabled
                                },
                                kb: startingLineup.roles.kb.toString(),
                                p: startingLineup.roles.p.toString()
                            }
                        },
                        setPlayList,
                        replacementPlayers: playerMetadata.filter(player => {
                            return replacementIds.includes(player.playerId);
                        })
                    });
                }
                const result = calculateMatchScores({
                    seasonStage: 'playoff',
                    roundNumber,
                    teamOne: teams[0],
                    teamTwo: teams[1]
                });
                for (const team of [result.teamOne, result.teamTwo]) {
                    playerSchema.array().parse(team.players);
                    trainerSchema.parse(team.trainer);
                }
                calculations.push({ document, result });
            }
            const userIds = documents.flatMap(document => {
                return [document.teamOne.userId, document.teamTwo.userId];
            });
            if (
                (await UserModel.countDocuments({
                    _id: { $in: userIds }
                }).exec()) !== userIds.length
            ) {
                throw new Error(`Missing team user for round: ${roundNumber}`);
            }
            for (const { document, result } of calculations) {
                document.set({
                    'teamOne.players': result.teamOne.players,
                    'teamOne.trainer': result.teamOne.trainer,
                    'teamTwo.players': result.teamTwo.players,
                    'teamTwo.trainer': result.teamTwo.trainer
                });
                await document.save();
                await SchedulePlayoffModel.updateOne(
                    { _id: document.scheduleId!._id, roundNumber },
                    {
                        $set: {
                            userOneScore: result.teamOneScore,
                            userTwoScore: result.teamTwoScore
                        }
                    }
                );
            }
            await currentSeason.updateSeason({
                isScoreCalculatdedPlayoff: {
                    ...currentSeason.isScoreCalculatdedPlayoff,
                    [roundNumber]: true
                }
            });
        } catch (error) {
            console.error('Error calculating playoff round scores:', error);
            throw error;
        }
    }
);

const ScoreDetailsPlayoffModel = model<
    ScoreDetailsPlayoffType,
    ScoreDetailsPlayoffModelType
>('ScoreDetailsPlayoff', scoreDetailsPlayoffSchema);

export default ScoreDetailsPlayoffModel;
