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
    seed: SchedulePlayoffType['userOneSeed'];
    score: SchedulePlayoffType['userOneScore'];
}

interface SchedulePlayoffMatchupDtoType {
    teamOne: SchedulePlayoffMatchupTeamDtoType;
    teamTwo: SchedulePlayoffMatchupTeamDtoType;
}

export interface SchedulePlayoffByStageDtoType {
    matchupOne: SchedulePlayoffMatchupDtoType;
    matchupTwo: SchedulePlayoffMatchupDtoType;
}

interface SchedulePlayoffModelType extends Model<SchedulePlayoffType> {
    getScheduleByStage: (
        stage: (typeof STAGE_ENUM)[number]
    ) => Promise<SchedulePlayoffByStageDtoType[]>;
}

type PopulatedSchedulePlayoffType = Omit<
    SchedulePlayoffType,
    'userOneId' | 'userTwoId'
> & {
    userOneId: Pick<UserType, 'teamName'> & { _id: Types.ObjectId };
    userTwoId: Pick<UserType, 'teamName'> & { _id: Types.ObjectId };
};

const schedulePlayoffSchema = new Schema<SchedulePlayoffType>({
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
            const documents = (await this.find({ stage })
                .populate({
                    path: 'userOneId',
                    select: 'teamName'
                })
                .populate({
                    path: 'userTwoId',
                    select: 'teamName'
                })
                .exec()) as PopulatedSchedulePlayoffType[];

            const groupedDocuments = new Map<
                string,
                Partial<SchedulePlayoffByStageDtoType>
            >();

            documents.forEach(document => {
                const groupKey = `${document.userOneId._id.toString()}-${document.userTwoId._id.toString()}`;

                const mappedMatchup = {
                    teamOne: {
                        teamName: document.userOneId.teamName,
                        seed: document.userOneSeed,
                        score: document.userOneScore
                    },
                    teamTwo: {
                        teamName: document.userTwoId.teamName,
                        seed: document.userTwoSeed,
                        score: document.userTwoScore
                    }
                };

                const existingGroup = groupedDocuments.get(groupKey) ?? {};

                if (document.roundNumber === 1) {
                    existingGroup.matchupOne = mappedMatchup;
                }

                if (document.roundNumber === 2) {
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
                    matchupOne: item.matchupOne!,
                    matchupTwo: item.matchupTwo!
                }));
        } catch (error) {
            console.error('Error fetching schedule playoff data:', error);
            throw error;
        }
    }
);

const SchedulePlayoffModel = model<
    SchedulePlayoffType,
    SchedulePlayoffModelType
>('SchedulePlayoff', schedulePlayoffSchema);

export default SchedulePlayoffModel;
