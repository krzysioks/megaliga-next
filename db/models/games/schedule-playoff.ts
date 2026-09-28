import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    roundNumberSchema,
    ScheduleStatus
} from '@/db/models/schema.types';
import StandingsModel from '@/db/models/standings';
import UserModel, { UserType } from '@/db/models/user';

//SchedulePlayoff is representation of megaliga_schedule_playoff of old megaliga database. Will be used for displaying playoff standings view and in wyniki view.

const STAGE_ENUM = ['3rdplace', 'semifinal', 'final'] as const;

export const schedulePlayoffZodSchema = z.object({
    userOneId: objectIdSchema,
    userTwoId: objectIdSchema,
    roundNumber: roundNumberSchema,
    userOneScore: z.number().min(0).optional(),
    userTwoScore: z.number().min(0).optional(),
    userOneSeed: z.number().min(1).max(4),
    userTwoSeed: z.number().min(1).max(4),
    stage: z.enum(STAGE_ENUM)
});

export type SchedulePlayoffType = z.infer<typeof schedulePlayoffZodSchema>;

interface SchedulePlayoffMatchupTeamDtoType {
    teamName: UserType['teamName'];
    logoUrl: UserType['logoUrl'];
    seed: SchedulePlayoffType['userOneSeed'];
    score: SchedulePlayoffType['userOneScore'];
}

interface SchedulePlayoffMatchupDtoType {
    teamOne: SchedulePlayoffMatchupTeamDtoType;
    teamTwo: SchedulePlayoffMatchupTeamDtoType;
}

export interface SchedulePlayoffByStageDtoType {
    id: Types.ObjectId;
    matchupOne: SchedulePlayoffMatchupDtoType;
    matchupTwo: SchedulePlayoffMatchupDtoType;
}

export type SchedulePlayoffUserDtoType = Pick<UserType, 'teamName' | 'logoUrl'>;

type PopulatedUserIdForHistoryType = Pick<UserType, 'teamName' | 'coachName'>;

export type SchedulePlayoffStandingsForHistoryReturnType = {
    place: number;
    teamName: UserType['teamName'];
    coachName: UserType['coachName'];
};

export type SchedulePlayoffScheduleForHistoryReturnType = {
    id: Types.ObjectId;
    userOne: PopulatedUserIdForHistoryType;
    userTwo: PopulatedUserIdForHistoryType;
    roundNumber: SchedulePlayoffType['roundNumber'];
    userOneScore?: SchedulePlayoffType['userOneScore'];
    userTwoScore?: SchedulePlayoffType['userTwoScore'];
    stage: 'playoff';
};

export type SchedulePlayoffByRoundDtoType = {
    id: Types.ObjectId;
    roundNumber: number;
    stage: SchedulePlayoffType['stage'];
    userOne: SchedulePlayoffUserDtoType;
    userTwo: SchedulePlayoffUserDtoType;
    userOneScore?: SchedulePlayoffType['userOneScore'];
    userTwoScore?: SchedulePlayoffType['userTwoScore'];
};

interface SchedulePlayoffModelType extends Model<SchedulePlayoffType> {
    getScheduleByStage: (
        stage: (typeof STAGE_ENUM)[number]
    ) => Promise<SchedulePlayoffByStageDtoType[]>;
    getScheduleByRound: (
        roundNumber: number
    ) => Promise<SchedulePlayoffByRoundDtoType[]>;
    getStandingsForHistory: () => Promise<
        SchedulePlayoffStandingsForHistoryReturnType[]
    >;
    getScheduleForHistory: () => Promise<
        SchedulePlayoffScheduleForHistoryReturnType[]
    >;
    getPlayoffScheduleStatus: () => Promise<ScheduleStatus>;
    getPlayoffScheduleFinalAnd3rdPlaceStatus: () => Promise<ScheduleStatus>;
    generateSemifinalPlayoffSchedule: () => Promise<void>;
    generateFinalAnd3rdPlacePlayoffSchedule: () => Promise<void>;
    deleteAll: () => Promise<void>;
}

type PopulatedSchedulePlayoffUserIdType = SchedulePlayoffUserDtoType & {
    _id: Types.ObjectId;
};

type PopulatedSchedulePlayoffType = Omit<
    SchedulePlayoffType,
    'userOneId' | 'userTwoId'
> & {
    _id: Types.ObjectId;
    userOneId: PopulatedSchedulePlayoffUserIdType;
    userTwoId: PopulatedSchedulePlayoffUserIdType;
};

type PopulatedSchedulePlayoffForHistoryType = Omit<
    SchedulePlayoffType,
    'userOneId' | 'userTwoId'
> & {
    _id: Types.ObjectId;
    userOneId: PopulatedUserIdForHistoryType;
    userTwoId: PopulatedUserIdForHistoryType;
};

type SemifinalPairTeamType = {
    userId: string;
    seed: SchedulePlayoffType['userOneSeed'];
};

// sums scores across both legs, then ranks the pair based on who scored more in total
const buildStagePlaces = (
    stageDocuments: PopulatedSchedulePlayoffForHistoryType[],
    firstPlace: number,
    secondPlace: number
) => {
    const userOneTotalScore = stageDocuments.reduce(
        (total, document) => total + (document.userOneScore ?? 0),
        0
    );
    const userTwoTotalScore = stageDocuments.reduce(
        (total, document) => total + (document.userTwoScore ?? 0),
        0
    );

    const [winner, runnerUp] =
        userOneTotalScore >= userTwoTotalScore
            ? [stageDocuments[0].userOneId, stageDocuments[0].userTwoId]
            : [stageDocuments[0].userTwoId, stageDocuments[0].userOneId];

    return [
        {
            place: firstPlace,
            teamName: winner.teamName,
            coachName: winner.coachName
        },
        {
            place: secondPlace,
            teamName: runnerUp.teamName,
            coachName: runnerUp.coachName
        }
    ];
};

// sums scores across both legs, then decides which team of the pair wins and which loses
const resolveSemifinalPairOutcome = (
    documents: HydratedDocument<SchedulePlayoffType>[]
) => {
    const userOneTotalScore = documents.reduce(
        (total, document) => total + (document.userOneScore ?? 0),
        0
    );
    const userTwoTotalScore = documents.reduce(
        (total, document) => total + (document.userTwoScore ?? 0),
        0
    );

    const userOneTeam: SemifinalPairTeamType = {
        userId: documents[0].userOneId?.toString() ?? '',
        seed: documents[0].userOneSeed
    };
    const userTwoTeam: SemifinalPairTeamType = {
        userId: documents[0].userTwoId?.toString() ?? '',
        seed: documents[0].userTwoSeed
    };

    return userOneTotalScore >= userTwoTotalScore
        ? { winner: userOneTeam, loser: userTwoTeam }
        : { winner: userTwoTeam, loser: userOneTeam };
};

// userOne is always the team with the better (lower) seed
const buildMatchup = (
    teamOne: SemifinalPairTeamType,
    teamTwo: SemifinalPairTeamType,
    stage: 'final' | '3rdplace'
) => {
    const [userOneTeam, userTwoTeam] =
        teamOne.seed <= teamTwo.seed ? [teamOne, teamTwo] : [teamTwo, teamOne];

    return {
        userOneId: userOneTeam.userId,
        userTwoId: userTwoTeam.userId,
        userOneSeed: userOneTeam.seed,
        userTwoSeed: userTwoTeam.seed,
        stage
    };
};

const schedulePlayoffSchema = new Schema<
    SchedulePlayoffType,
    SchedulePlayoffModelType
>({
    userOneId: { type: Types.ObjectId, ref: 'User' },
    userTwoId: { type: Types.ObjectId, ref: 'User' },
    roundNumber: { type: Number, required: true },
    userOneScore: { type: Number },
    userTwoScore: { type: Number },
    userOneSeed: { type: Number, required: true },
    userTwoSeed: { type: Number, required: true },
    stage: {
        type: String,
        required: true,
        enum: STAGE_ENUM
    }
});

schedulePlayoffSchema.static(
    'getScheduleByStage',
    async function getScheduleByStage(stage: (typeof STAGE_ENUM)[number]) {
        try {
            const documents: PopulatedSchedulePlayoffType[] = await this.find({
                stage
            })
                .populate<{ userOneId: PopulatedSchedulePlayoffUserIdType }>({
                    path: 'userOneId',
                    select: 'teamName logoUrl'
                })
                .populate<{ userTwoId: PopulatedSchedulePlayoffUserIdType }>({
                    path: 'userTwoId',
                    select: 'teamName logoUrl'
                })
                .exec();

            const groupedDocuments = new Map<
                string,
                Partial<SchedulePlayoffByStageDtoType>
            >();

            documents
                .sort((a, b) => a.roundNumber - b.roundNumber)
                .forEach(document => {
                    const groupKey = `${document.userOneId._id.toString()}-${document.userTwoId._id.toString()}`;

                    const mappedMatchup = {
                        teamOne: {
                            teamName: document.userOneId.teamName,
                            logoUrl: document.userOneId.logoUrl,
                            seed: document.userOneSeed,
                            score: document.userOneScore
                        },
                        teamTwo: {
                            teamName: document.userTwoId.teamName,
                            logoUrl: document.userTwoId.logoUrl,
                            seed: document.userTwoSeed,
                            score: document.userTwoScore
                        }
                    };

                    const existingGroup = groupedDocuments.get(groupKey) ?? {};

                    if (!existingGroup.matchupOne) {
                        existingGroup.id = document._id;
                        existingGroup.matchupOne = mappedMatchup;
                    } else {
                        if (!existingGroup.id) {
                            existingGroup.id = document._id;
                        }
                        existingGroup.matchupTwo = mappedMatchup;
                    }

                    groupedDocuments.set(groupKey, existingGroup);
                });

            return Array.from(groupedDocuments.values())
                .filter(
                    item =>
                        item.matchupOne !== undefined &&
                        item.matchupTwo !== undefined
                )
                .map(item => ({
                    id: item.id!,
                    matchupOne: item.matchupOne!,
                    matchupTwo: item.matchupTwo!
                }));
        } catch (error) {
            console.error('Error fetching schedule playoff data:', error);
            throw error;
        }
    }
);

schedulePlayoffSchema.static(
    'getScheduleByRound',
    async function getScheduleByRound(roundNumber: number) {
        try {
            const documents: PopulatedSchedulePlayoffType[] = await this.find({
                roundNumber
            })
                .populate<{ userOneId: PopulatedSchedulePlayoffUserIdType }>({
                    path: 'userOneId',
                    select: 'teamName logoUrl'
                })
                .populate<{ userTwoId: PopulatedSchedulePlayoffUserIdType }>({
                    path: 'userTwoId',
                    select: 'teamName logoUrl'
                })
                .exec();

            if (!documents.length) {
                throw new Error(
                    `Schedules playoff for given roundNumber: ${roundNumber} don't exist: `
                );
            }

            return documents.map((document: PopulatedSchedulePlayoffType) => {
                return {
                    id: document._id,
                    roundNumber: document.roundNumber,
                    stage: document.stage,
                    userOne: {
                        teamName: document.userOneId?.teamName ?? '',
                        logoUrl: document.userOneId?.logoUrl ?? ''
                    },
                    userTwo: {
                        teamName: document.userTwoId?.teamName ?? '',
                        logoUrl: document.userTwoId?.logoUrl ?? ''
                    },
                    userOneScore: document.userOneScore,
                    userTwoScore: document.userTwoScore
                };
            });
        } catch (error) {
            console.error('Error fetching schedule playoff by round:', error);
            throw error;
        }
    }
);

schedulePlayoffSchema.static(
    'getStandingsForHistory',
    async function getStandingsForHistory() {
        try {
            const documents: PopulatedSchedulePlayoffForHistoryType[] =
                await this.find({
                    stage: { $in: ['final', '3rdplace'] }
                })
                    .populate<{ userOneId: PopulatedUserIdForHistoryType }>({
                        path: 'userOneId',
                        select: 'teamName coachName'
                    })
                    .populate<{ userTwoId: PopulatedUserIdForHistoryType }>({
                        path: 'userTwoId',
                        select: 'teamName coachName'
                    })
                    .exec();

            const finalDocuments = documents.filter(
                document => document.stage === 'final'
            );
            const thirdPlaceDocuments = documents.filter(
                document => document.stage === '3rdplace'
            );

            if (finalDocuments.length < 2 || thirdPlaceDocuments.length < 2) {
                throw new Error(
                    'Final standings not found: missing final or 3rdplace schedule data'
                );
            }

            return [
                ...buildStagePlaces(finalDocuments, 1, 2),
                ...buildStagePlaces(thirdPlaceDocuments, 3, 4)
            ];
        } catch (error) {
            console.error('Error fetching final standings:', error);
            throw error;
        }
    }
);

schedulePlayoffSchema.static(
    'getScheduleForHistory',
    async function getScheduleForHistory() {
        try {
            const documents: PopulatedSchedulePlayoffForHistoryType[] =
                await this.find()
                    .populate<{ userOneId: PopulatedUserIdForHistoryType }>({
                        path: 'userOneId',
                        select: 'teamName coachName'
                    })
                    .populate<{ userTwoId: PopulatedUserIdForHistoryType }>({
                        path: 'userTwoId',
                        select: 'teamName coachName'
                    })
                    .exec();

            if (!documents.length) {
                throw new Error('Schedule not found');
            }

            return documents.map(document => {
                return {
                    id: document._id,
                    userOne: {
                        teamName: document.userOneId?.teamName ?? '',
                        coachName: document.userOneId?.coachName ?? ''
                    },
                    userTwo: {
                        teamName: document.userTwoId?.teamName ?? '',
                        coachName: document.userTwoId?.coachName ?? ''
                    },
                    roundNumber: document.roundNumber,
                    userOneScore: document.userOneScore,
                    userTwoScore: document.userTwoScore,
                    stage: 'playoff' as const
                };
            });
        } catch (error) {
            console.error(
                'Error fetching schedule playoff data for history:',
                error
            );
            throw error;
        }
    }
);

schedulePlayoffSchema.static('deleteAll', async function deleteAll() {
    try {
        await this.deleteMany({});
    } catch (error) {
        console.error('Error deleting all schedule playoff documents:', error);
        throw error;
    }
});

schedulePlayoffSchema.static(
    'getPlayoffScheduleStatus',
    async function getPlayoffScheduleStatus(): Promise<ScheduleStatus> {
        try {
            const count = await this.countDocuments({ stage: 'semifinal' });
            if (count > 0) {
                return ScheduleStatus.Generated;
            }

            return ScheduleStatus.ReadyForGeneration;
        } catch (error) {
            console.error('Error checking playoff schedule status:', error);
            throw error;
        }
    }
);

schedulePlayoffSchema.static(
    'getPlayoffScheduleFinalAnd3rdPlaceStatus',
    async function getPlayoffScheduleFinalAnd3rdPlaceStatus(): Promise<ScheduleStatus> {
        try {
            const existingFinalOrThirdPlaceCount = await this.countDocuments({
                stage: { $in: ['final', '3rdplace'] }
            });
            if (existingFinalOrThirdPlaceCount > 0) {
                return ScheduleStatus.Generated;
            }

            const pairOneDocuments = await this.find({
                stage: 'semifinal',
                userOneSeed: 1,
                userTwoSeed: 4
            }).exec();
            const pairTwoDocuments = await this.find({
                stage: 'semifinal',
                userOneSeed: 2,
                userTwoSeed: 3
            }).exec();

            const hasCompleteSemifinalSchedule =
                pairOneDocuments.length === 2 &&
                pairTwoDocuments.length === 2 &&
                [...pairOneDocuments, ...pairTwoDocuments].every(
                    document =>
                        document.userOneScore !== undefined &&
                        document.userTwoScore !== undefined
                );

            return hasCompleteSemifinalSchedule
                ? ScheduleStatus.ReadyForGeneration
                : ScheduleStatus.NotReadyForGeneration;
        } catch (error) {
            console.error(
                'Error checking final and 3rdplace playoff schedule status:',
                error
            );
            throw error;
        }
    }
);

schedulePlayoffSchema.static(
    'generateSemifinalPlayoffSchedule',
    async function generateSemifinalPlayoffSchedule(): Promise<void> {
        try {
            const existingSemifinalCount = await this.countDocuments({
                stage: 'semifinal'
            });
            if (existingSemifinalCount > 0) {
                throw new Error(
                    'Semifinal playoff schedule has already been generated'
                );
            }

            const standings = await StandingsModel.getStandings();

            if (standings.length < 4) {
                throw new Error(
                    'At least 4 standings entries are required to generate semifinal playoff schedule'
                );
            }

            const qualifiedUserIds = standings
                .slice(0, 4)
                .map(standing => standing.userId);
            const nonQualifiedUserIds = standings
                .slice(4)
                .map(standing => standing.userId);

            await UserModel.updateMany(
                { _id: { $in: qualifiedUserIds } },
                { $set: { reachedPlayoff: true } }
            );
            await UserModel.updateMany(
                { _id: { $in: nonQualifiedUserIds } },
                { $set: { reachedPlayoff: false } }
            );

            const pairs = [
                {
                    userOneId: standings[0].userId,
                    userTwoId: standings[3].userId,
                    userOneSeed: 1,
                    userTwoSeed: 4
                },
                {
                    userOneId: standings[1].userId,
                    userTwoId: standings[2].userId,
                    userOneSeed: 2,
                    userTwoSeed: 3
                }
            ];

            const scheduleDocuments: SchedulePlayoffType[] = pairs.flatMap(
                pair => {
                    return [
                        {
                            userOneId: pair.userOneId,
                            userTwoId: pair.userTwoId,
                            roundNumber: 1,
                            userOneSeed: pair.userOneSeed,
                            userTwoSeed: pair.userTwoSeed,
                            stage: 'semifinal' as const
                        },
                        {
                            userOneId: pair.userOneId,
                            userTwoId: pair.userTwoId,
                            roundNumber: 2,
                            userOneSeed: pair.userOneSeed,
                            userTwoSeed: pair.userTwoSeed,
                            stage: 'semifinal' as const
                        }
                    ];
                }
            );

            await this.create(scheduleDocuments);
        } catch (error) {
            console.error(
                'Error generating semifinal playoff schedule:',
                error
            );
            throw error;
        }
    }
);

schedulePlayoffSchema.static(
    'generateFinalAnd3rdPlacePlayoffSchedule',
    async function generateFinalAnd3rdPlacePlayoffSchedule(): Promise<void> {
        try {
            const existingFinalOrThirdPlaceCount = await this.countDocuments({
                stage: { $in: ['final', '3rdplace'] }
            });
            if (existingFinalOrThirdPlaceCount > 0) {
                throw new Error(
                    'Final and 3rdplace playoff schedule has already been generated'
                );
            }

            const pairOneDocuments = await this.find({
                stage: 'semifinal',
                userOneSeed: 1,
                userTwoSeed: 4
            }).exec();
            const pairTwoDocuments = await this.find({
                stage: 'semifinal',
                userOneSeed: 2,
                userTwoSeed: 3
            }).exec();

            if (
                pairOneDocuments.length !== 2 ||
                pairTwoDocuments.length !== 2
            ) {
                throw new Error('Semifinal playoff schedule not found');
            }

            const hasIncompleteScores = [
                ...pairOneDocuments,
                ...pairTwoDocuments
            ].some(
                document =>
                    document.userOneScore === undefined ||
                    document.userTwoScore === undefined
            );
            if (hasIncompleteScores) {
                throw new Error(
                    'Semifinal playoff schedule scores are not fully filled in'
                );
            }

            const pairOneOutcome =
                resolveSemifinalPairOutcome(pairOneDocuments);
            const pairTwoOutcome =
                resolveSemifinalPairOutcome(pairTwoDocuments);

            const finalMatchup = buildMatchup(
                pairOneOutcome.winner,
                pairTwoOutcome.winner,
                'final'
            );
            const thirdPlaceMatchup = buildMatchup(
                pairOneOutcome.loser,
                pairTwoOutcome.loser,
                '3rdplace'
            );

            const scheduleDocuments: SchedulePlayoffType[] = [
                finalMatchup,
                thirdPlaceMatchup
            ].flatMap(matchup => {
                return [
                    { ...matchup, roundNumber: 3 },
                    { ...matchup, roundNumber: 4 }
                ];
            });

            await this.create(scheduleDocuments);
        } catch (error) {
            console.error(
                'Error generating final and 3rdplace playoff schedule:',
                error
            );
            throw error;
        }
    }
);

const SchedulePlayoffModel = model<
    SchedulePlayoffType,
    SchedulePlayoffModelType
>('SchedulePlayoff', schedulePlayoffSchema);

export default SchedulePlayoffModel;
