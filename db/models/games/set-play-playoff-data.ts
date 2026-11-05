import type {
    SetPlayAdminDataType,
    SetPlayDataType,
    SetPlayPayloadType,
    SetPlayUserDataType
} from '@/db/models/set-play-payload.schema';
import type { SetPlaysType } from '@/db/models/set-plays';

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';

import { MIN_PLAYOFF_ROUND, MAX_PLAYOFF_ROUND } from '@/db/db.constants';
import { normalizeSetPlayData } from '@/db/db.utils';
import StartingLineupPlayoffModel from '@/db/models/games/starting-lineup-playoff';
import { objectIdSchema, SetPlayEnumType } from '@/db/models/schema.types';
import { setPlayPayloadListZodSchema } from '@/db/models/set-play-payload.schema';
import UserModel from '@/db/models/user';
import { validateSetPlayConstraints } from '@/db/models/validation.utils';

import '@/db/models/set-plays';

type SetPlayListItemType = {
    _id: Types.ObjectId;
    setPlayId: Types.ObjectId;
    userData?: SetPlayUserDataType;
    adminData?: SetPlayAdminDataType;
};

export type SetPlayPlayoffDataType = {
    startingLineupId: Types.ObjectId;
    setPlayList: SetPlayListItemType[];
};

type PopulatedSetPlayType = {
    _id: Types.ObjectId;
    name: SetPlaysType['name'];
    type: SetPlaysType['type'];
};

type PopulatedSetPlayListItemType = Omit<SetPlayListItemType, 'setPlayId'> & {
    setPlayId: PopulatedSetPlayType;
};

export type PopulatedSetPlayPlayoffDataType = Omit<
    SetPlayPlayoffDataType,
    'setPlayList'
> & {
    setPlayList: PopulatedSetPlayListItemType[];
};

export type PopulatedFindType = HydratedDocument<
    PopulatedSetPlayPlayoffDataType,
    SetPlayPlayoffDataMethodsType
>;

export type SetPlayPlayoffDataSelectionReturnType = SetPlayPayloadType & {
    name: string;
    setPlayId: string;
    selectedSetPlayId: string;
};
export type SetPlayPlayoffDataForUserReturnType = Pick<
    SetPlaysType,
    'name' | 'type'
> & {
    selectedSetPlayId: string;
    setPlayId: string;
    userData: SetPlayUserDataType | null;
};
export type SetPlayPlayoffDataForAdminReturnType = Pick<
    SetPlaysType,
    'name' | 'type'
> & {
    selectedSetPlayId: string;
    setPlayId: string;
    adminData: SetPlayAdminDataType | null;
};

export type SetPlayPlayoffDataListByStartingLineupIdReturnType = {
    setPlayList: SetPlayPlayoffDataSelectionReturnType[];
};

interface SetPlayPlayoffDataMethodsType {
    saveSelectedSetPlay: () => Promise<SetPlayPlayoffDataSelectionReturnType[]>;
}

interface SetPlayPlayoffDataModelType
    extends Model<SetPlayPlayoffDataType, '', SetPlayPlayoffDataMethodsType> {
    getSetPlayListByStartingLineupId: (
        startingLineupId: string
    ) => Promise<SetPlayPlayoffDataListByStartingLineupIdReturnType>;
    getSetPlaysForUser: (
        startingLineupId: string
    ) => Promise<SetPlayPlayoffDataForUserReturnType[]>;
    getSetPlaysForAdmin: (
        roundNumber: number,
        userId: string
    ) => Promise<SetPlayPlayoffDataForAdminReturnType[]>;
    saveSetPlay: (
        startingLineupId: string,
        setPlayData: SetPlayDataType,
        setPlayType: SetPlayEnumType
    ) => Promise<SetPlayPlayoffDataSelectionReturnType[]>;
    updateSetPlay: (
        startingLineupId: string,
        selectedSetPlayId: string,
        setPlayData: SetPlayDataType
    ) => Promise<SetPlayPlayoffDataSelectionReturnType[]>;
    removeSetPlay: (
        startingLineupId: string,
        selectedSetPlayId: string
    ) => Promise<SetPlayPlayoffDataSelectionReturnType[]>;
    saveAdminSetPlay: (
        roundNumber: string,
        userId: string,
        setPlayData: SetPlayDataType[]
    ) => Promise<void>;
}

const setPlayListSchema = new Schema<SetPlayListItemType>({
    setPlayId: {
        type: Schema.Types.ObjectId,
        ref: 'SetPlays',
        required: true
    },
    // Catalog-dependent payloads are parsed by the validation hook before saving.
    userData: { type: Schema.Types.Mixed, default: undefined },
    adminData: { type: Schema.Types.Mixed, default: undefined }
});
const setPlayPlayoffDataSchema = new Schema<
    SetPlayPlayoffDataType,
    SetPlayPlayoffDataModelType,
    SetPlayPlayoffDataMethodsType
>({
    startingLineupId: {
        type: Schema.Types.ObjectId,
        ref: 'StartingLineupPlayoff',
        required: true,
        unique: true
    },
    setPlayList: { type: [setPlayListSchema], default: [] }
});

setPlayPlayoffDataSchema.pre(
    'validate',
    async function validateSetPlayDocument() {
        const document = this.toObject({
            depopulate: true,
            flattenObjectIds: true
        });
        objectIdSchema.unwrap().parse(document.startingLineupId);
        document.setPlayList.forEach(play => {
            objectIdSchema.unwrap().parse(play.setPlayId);
        });
        const populated = await this.populate<PopulatedFindType>({
            path: 'setPlayList.setPlayId',
            select: 'name type'
        });
        const plays = populated
            .toObject<PopulatedSetPlayPlayoffDataType>({
                flattenObjectIds: true,
                // Keep empty payloads so validation can reject missing required fields.
                minimize: false
            })
            .setPlayList.map(({ _id, setPlayId, ...play }) => {
                if (!setPlayId) {
                    throw new Error(
                        'Set play with provided setPlayId does not exists'
                    );
                }
                return {
                    ...play,
                    setPlayId: setPlayId._id.toString(),
                    name: setPlayId.name,
                    type: setPlayId.type,
                    selectedSetPlayId: _id.toString()
                } as SetPlayPlayoffDataSelectionReturnType;
            });
        const entries = setPlayPayloadListZodSchema.parse(plays);
        this.depopulate('setPlayList.setPlayId');
        this.set(
            'setPlayList',
            entries.map((entry, index) => {
                if (
                    entry.type === SetPlayEnumType.BrudnaPala &&
                    entry.adminData === undefined
                ) {
                    entry.adminData = {
                        isDisabled: false,
                        playerResults: Object.fromEntries(
                            entry.userData.leaderIdList.map(playerId => {
                                return [playerId, false];
                            })
                        )
                    };
                }
                return {
                    _id: plays[index].selectedSetPlayId,
                    setPlayId: plays[index].setPlayId,
                    ...('userData' in entry
                        ? { userData: normalizeSetPlayData(entry.userData) }
                        : {}),
                    ...('adminData' in entry && entry.adminData !== undefined
                        ? {
                              adminData:
                                  entry.type === SetPlayEnumType.Remis
                                      ? Object.fromEntries(
                                            Object.entries(entry.adminData).map(
                                                ([playerId, isSelected]) => {
                                                    return [
                                                        playerId.toLowerCase(),
                                                        isSelected
                                                    ];
                                                }
                                            )
                                        )
                                      : normalizeSetPlayData(entry.adminData)
                          }
                        : {})
                };
            })
        );
    }
);

setPlayPlayoffDataSchema.method(
    'saveSelectedSetPlay',
    async function saveSelectedSetPlay() {
        try {
            await this.save();
            const document = await this.populate<PopulatedFindType>({
                path: 'setPlayList.setPlayId',
                select: 'name type'
            });
            return document
                .toObject<PopulatedSetPlayPlayoffDataType>({
                    flattenObjectIds: true
                })
                .setPlayList.map(({ _id, setPlayId, ...play }) => {
                    return {
                        ...play,
                        selectedSetPlayId: _id.toString(),
                        setPlayId: setPlayId._id.toString(),
                        name: setPlayId.name,
                        type: setPlayId.type
                    } as SetPlayPlayoffDataSelectionReturnType;
                });
        } catch (error) {
            console.error('Error saving selected set play:', error);
            throw error;
        }
    }
);

setPlayPlayoffDataSchema.static(
    'getSetPlayListByStartingLineupId',
    async function getSetPlayListByStartingLineupId(
        startingLineupId: string
    ): Promise<SetPlayPlayoffDataListByStartingLineupIdReturnType> {
        try {
            const document: PopulatedFindType | null = await this.findOne({
                startingLineupId
            })
                .select('setPlayList')
                .populate<PopulatedFindType>({
                    path: 'setPlayList.setPlayId',
                    select: 'name type'
                })
                .exec();

            if (!document) {
                return { setPlayList: [] };
            }

            return {
                setPlayList: document
                    .toObject<PopulatedSetPlayPlayoffDataType>({
                        flattenObjectIds: true
                    })
                    .setPlayList.map(({ _id, setPlayId, ...play }) => {
                        return {
                            ...play,
                            setPlayId: setPlayId._id.toString(),
                            name: setPlayId.name,
                            type: setPlayId.type,
                            selectedSetPlayId: _id.toString()
                        } as SetPlayPlayoffDataSelectionReturnType;
                    })
            };
        } catch (error) {
            console.error(
                'Error fetching set play list by startingLineupId:',
                error
            );
            throw error;
        }
    }
);

// on dashboard view we will know userId and roundNumber, so we will be able to get startingLineupId, that should be passed to this function. User will be able to add set plays only after saving staring lineup. This will assure, startingLineupId will be found
setPlayPlayoffDataSchema.static(
    'getSetPlaysForUser',
    async function getSetPlaysForUser(
        startingLineupId: string
    ): Promise<SetPlayPlayoffDataForUserReturnType[]> {
        try {
            const setPlayDocument: PopulatedFindType | null =
                await this.findOne({
                    startingLineupId
                })
                    .select(
                        'setPlayList._id setPlayList.setPlayId setPlayList.userData'
                    )
                    .populate<PopulatedFindType>({
                        path: 'setPlayList.setPlayId',
                        select: 'name type'
                    })
                    .exec();

            if (!setPlayDocument) {
                return [];
            }

            return setPlayDocument
                .toObject({ flattenObjectIds: true })
                .setPlayList.map(setPlay => {
                    if (!setPlay.setPlayId) {
                        throw new Error(
                            'Missing catalog entry for selected set play'
                        );
                    }
                    return {
                        selectedSetPlayId: setPlay._id.toString(),
                        setPlayId: setPlay.setPlayId._id.toString(),
                        name: setPlay.setPlayId.name,
                        type: setPlay.setPlayId.type,
                        userData: setPlay.userData ?? null
                    };
                });
        } catch (error) {
            console.error('Error fetching set plays for user:', error);
            throw error;
        }
    }
);

setPlayPlayoffDataSchema.static(
    'getSetPlaysForAdmin',
    async function getSetPlaysForAdmin(
        roundNumber: number,
        userId: string
    ): Promise<SetPlayPlayoffDataForAdminReturnType[]> {
        try {
            if (
                roundNumber < MIN_PLAYOFF_ROUND ||
                roundNumber > MAX_PLAYOFF_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_PLAYOFF_ROUND} and ${MAX_PLAYOFF_ROUND}`
                );
            }

            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            const startingLineupDocument =
                await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                    userId,
                    roundNumber
                );
            if (!startingLineupDocument) {
                return [];
            }

            const setPlayDocument: PopulatedFindType | null =
                await this.findOne({
                    startingLineupId: startingLineupDocument._id
                })
                    .select(
                        'setPlayList._id setPlayList.setPlayId setPlayList.adminData'
                    )
                    .populate<PopulatedFindType>({
                        path: 'setPlayList.setPlayId',
                        select: 'name type'
                    })
                    .exec();

            if (!setPlayDocument) {
                return [];
            }

            return setPlayDocument
                .toObject({ flattenObjectIds: true })
                .setPlayList.map(setPlay => {
                    if (!setPlay.setPlayId) {
                        throw new Error(
                            'Missing catalog entry for selected set play'
                        );
                    }
                    let adminData = setPlay.adminData ?? null;
                    if (
                        setPlay.setPlayId.type === SetPlayEnumType.Remis &&
                        adminData === null
                    ) {
                        adminData = Object.fromEntries(
                            [
                                startingLineupDocument.playerOne,
                                startingLineupDocument.playerTwo,
                                startingLineupDocument.playerThree,
                                startingLineupDocument.playerFour,
                                startingLineupDocument.playerFive
                            ].map(playerId => {
                                return [playerId!.toString(), false];
                            })
                        );
                    }
                    return {
                        selectedSetPlayId: setPlay._id.toString(),
                        setPlayId: setPlay.setPlayId._id.toString(),
                        name: setPlay.setPlayId.name,
                        type: setPlay.setPlayId.type,
                        adminData
                    };
                });
        } catch (error) {
            console.error('Error fetching set plays for admin:', error);
            throw error;
        }
    }
);

setPlayPlayoffDataSchema.static(
    'saveSetPlay',
    async function saveSetPlay(
        startingLineupId: string,
        setPlayData: SetPlayDataType,
        setPlayType: SetPlayEnumType
    ) {
        try {
            const startingLineupExists =
                await StartingLineupPlayoffModel.exists({
                    _id: startingLineupId
                });
            if (!startingLineupExists) {
                throw new Error(
                    `Invalid startingLineupId: ${startingLineupId}`
                );
            }

            const existingDocument: PopulatedFindType | null =
                await this.findOne({ startingLineupId })
                    .populate<PopulatedFindType>({
                        path: 'setPlayList.setPlayId',
                        select: 'type'
                    })
                    .exec();
            const availableTypes = validateSetPlayConstraints(
                existingDocument?.setPlayList.map(item => item.setPlayId) ?? []
            );
            if (!availableTypes.includes(setPlayType)) {
                throw new Error(
                    'Selected set play cannot be added due to megaliga setPlays rules'
                );
            }

            const document = existingDocument ?? new this({ startingLineupId });
            document.depopulate('setPlayList.setPlayId');
            document.set('setPlayList', [
                ...document.setPlayList,
                {
                    setPlayId: setPlayData.setPlayId,
                    userData: setPlayData.userData
                }
            ]);
            return await document.saveSelectedSetPlay();
        } catch (error) {
            console.error('Error saving set play:', error);
            throw error;
        }
    }
);

setPlayPlayoffDataSchema.static(
    'updateSetPlay',
    async function updateSetPlay(
        startingLineupId: string,
        selectedSetPlayId: string,
        setPlayData: SetPlayDataType
    ): Promise<SetPlayPlayoffDataSelectionReturnType[]> {
        try {
            const document = await this.findOne({ startingLineupId }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }

            const selectedSetPlays = document.toObject().setPlayList;
            const selectedSetPlayExists = selectedSetPlays.some(
                setPlay => setPlay._id.toString() === selectedSetPlayId
            );
            if (!selectedSetPlayExists) {
                throw new Error('Selected set play not found');
            }

            document.set(
                'setPlayList',
                selectedSetPlays.map(setPlay => {
                    if (setPlay._id.toString() !== selectedSetPlayId) {
                        return setPlay;
                    }
                    return {
                        ...setPlay,
                        setPlayId: setPlayData.setPlayId,
                        userData: setPlayData.userData
                    };
                })
            );
            return await document.saveSelectedSetPlay();
        } catch (error) {
            console.error('Error updating set play:', error);
            throw error;
        }
    }
);

setPlayPlayoffDataSchema.static(
    'removeSetPlay',
    async function removeSetPlay(
        startingLineupId: string,
        selectedSetPlayId: string
    ): Promise<SetPlayPlayoffDataSelectionReturnType[]> {
        try {
            const document = await this.findOne({ startingLineupId }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }

            const selectedSetPlays = document.toObject().setPlayList;
            const selectedSetPlayExists = selectedSetPlays.some(
                setPlay => setPlay._id.toString() === selectedSetPlayId
            );
            if (!selectedSetPlayExists) {
                throw new Error('Selected set play not found');
            }

            document.set(
                'setPlayList',
                selectedSetPlays.filter(
                    setPlay => setPlay._id.toString() !== selectedSetPlayId
                )
            );
            return await document.saveSelectedSetPlay();
        } catch (error) {
            console.error('Error removing set play:', error);
            throw error;
        }
    }
);

setPlayPlayoffDataSchema.static(
    'saveAdminSetPlay',
    async function saveAdminSetPlay(
        roundNumber: string,
        userId: string,
        setPlayData: SetPlayDataType[]
    ): Promise<void> {
        try {
            const round = Number(roundNumber);
            if (
                !Number.isInteger(round) ||
                round < MIN_PLAYOFF_ROUND ||
                round > MAX_PLAYOFF_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_PLAYOFF_ROUND} and ${MAX_PLAYOFF_ROUND}`
                );
            }

            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }
            if (!setPlayData.length) {
                return;
            }

            const startingLineupDocument =
                await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                    userId,
                    round
                );
            if (!startingLineupDocument) {
                throw new Error('No starting lineup for user and round');
            }

            const document = await this.findOne({
                startingLineupId: startingLineupDocument._id
            }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }

            const selectedSetPlays = document.toObject().setPlayList;
            for (const item of setPlayData) {
                const selectedSetPlayExists = selectedSetPlays.some(
                    setPlay => setPlay._id.toString() === item.selectedSetPlayId
                );
                if (!selectedSetPlayExists) {
                    throw new Error('Selected set play not found');
                }
            }

            document.set(
                'setPlayList',
                selectedSetPlays.map(setPlay => {
                    const item = setPlayData.find(item => {
                        return (
                            item.selectedSetPlayId === setPlay._id.toString()
                        );
                    });
                    if (!item || item.adminData === undefined) {
                        return setPlay;
                    }
                    return { ...setPlay, adminData: item.adminData };
                })
            );
            await document.save();
        } catch (error) {
            console.error('Error saving admin set plays:', error);
            throw error;
        }
    }
);

const SetPlayPlayoffDataModel = model<
    SetPlayPlayoffDataType,
    SetPlayPlayoffDataModelType
>('SetPlayPlayoffData', setPlayPlayoffDataSchema);
export default SetPlayPlayoffDataModel;
