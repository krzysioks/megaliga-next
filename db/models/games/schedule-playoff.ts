import { model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, roundNumberSchema } from '@/db/models/schema.types';
import { UserType } from '@/db/models/user';

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

const SchedulePlayoffModel = model<
    SchedulePlayoffType,
    SchedulePlayoffModelType
>('SchedulePlayoff', schedulePlayoffSchema);

export default SchedulePlayoffModel;
