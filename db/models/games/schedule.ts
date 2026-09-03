import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import LigueGroupsModel from '@/db/models/ligue-groups';
import { objectIdSchema, roundNumberSchema } from '@/db/models/schema.types';
import { UserType } from '@/db/models/user';

//Schedule is representation of megaliga_schedule of old megaliga database. Will be used for displaying results of latest round in Trybuna and Wyniki view. id_rematch_schedule fields are not migrated, as there is no more rule to add extra point for winning rematch.

export const scheduleZodSchema = z.object({
    userOneId: objectIdSchema,
    userTwoId: objectIdSchema,
    roundNumber: roundNumberSchema,
    ligueGroupsId: objectIdSchema,
    userOneScore: z.number().min(0).optional(),
    userTwoScore: z.number().min(0).optional()
});

export type ScheduleType = z.infer<typeof scheduleZodSchema>;

type PopulatedScheduleType = Omit<ScheduleType, 'userOneId' | 'userTwoId'> & {
    userOneId?: Pick<UserType, 'teamName' | 'logoUrl'>;
    userTwoId?: Pick<UserType, 'teamName' | 'logoUrl'>;
};

export type PopulatedFindType = HydratedDocument<PopulatedScheduleType>;

export type ScheduleUserDtoType = Pick<UserType, 'teamName' | 'logoUrl'>;

export type ScheduleByRoundDtoType = {
    id: Types.ObjectId;
    roundNumber: number;
    ligueGroupsId: string;
    userOne: ScheduleUserDtoType;
    userTwo: ScheduleUserDtoType;
    userOneScore?: number;
    userTwoScore?: number;
};

type PopulatedUserIdForHistoryType = Pick<UserType, 'teamName' | 'coachName'>;

export type ScheduleForHistoryReturnType = {
    userOne: PopulatedUserIdForHistoryType;
    userTwo: PopulatedUserIdForHistoryType;
    roundNumber: ScheduleType['roundNumber'];
    userOneScore?: ScheduleType['userOneScore'];
    userTwoScore?: ScheduleType['userTwoScore'];
    stage: 'regularSeason';
};

type PopulatedScheduleForHistoryType = Omit<
    ScheduleType,
    'userOneId' | 'userTwoId'
> & {
    userOneId?: PopulatedUserIdForHistoryType;
    userTwoId?: PopulatedUserIdForHistoryType;
};

interface ScheduleModelType extends Model<ScheduleType> {
    getScheduleByRound: (
        roundNumber: number,
        ligueGroupsId: string
    ) => Promise<ScheduleByRoundDtoType[]>;
    getScheduleForHistory: () => Promise<ScheduleForHistoryReturnType[]>;
}

const scheduleSchema = new Schema<ScheduleType, ScheduleModelType>({
    userOneId: { type: Types.ObjectId, ref: 'User' },
    userTwoId: { type: Types.ObjectId, ref: 'User' },
    roundNumber: { type: Number, required: true },
    ligueGroupsId: { type: Types.ObjectId, ref: 'LigueGroups' },
    userOneScore: { type: Number },
    userTwoScore: { type: Number }
});

scheduleSchema.static(
    'getScheduleByRound',
    async function getScheduleByRound(
        roundNumber: number,
        ligueGroupsId: string
    ) {
        try {
            const isValidLigueGroupsId = await LigueGroupsModel.exists({
                _id: ligueGroupsId
            });
            if (!isValidLigueGroupsId) {
                throw new Error(`Invalid ligueGroupsId: ${ligueGroupsId}`);
            }

            const documents = await this.find({
                ligueGroupsId,
                roundNumber
            })
                .populate<{ userOneId: ScheduleUserDtoType }>({
                    path: 'userOneId',
                    select: 'teamName logoUrl'
                })
                .populate<{ userTwoId: ScheduleUserDtoType }>({
                    path: 'userTwoId',
                    select: 'teamName logoUrl'
                })
                .exec();

            if (!documents.length) {
                throw new Error(
                    `Schedules for given ligueGroupsId: ${ligueGroupsId} and roundNumber: ${roundNumber} don't exist: `
                );
            }

            return documents.map(document => {
                return {
                    id: document._id,
                    roundNumber: document.roundNumber,
                    ligueGroupsId: document.ligueGroupsId?.toString() ?? '',
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
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            console.error(
                'Error fetching number of available positions by ligueGroupsIs:',
                error
            );
            throw error;
        }
    }
);

scheduleSchema.static(
    'getScheduleForHistory',
    async function getScheduleForHistory() {
        try {
            const documents: PopulatedScheduleForHistoryType[] =
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
                    stage: 'regularSeason' as const
                };
            });
        } catch (error) {
            console.error('Error fetching schedule data for history:', error);
            throw error;
        }
    }
);

const ScheduleModel = model<ScheduleType, ScheduleModelType>(
    'Schedule',
    scheduleSchema
);

export default ScheduleModel;
