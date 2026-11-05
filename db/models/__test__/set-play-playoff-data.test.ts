import type { SetPlayDataType } from '@/db/models/set-play-payload.schema';

import mongoose from 'mongoose';
import { ZodError } from 'zod';

import { DBClient } from '@/db/db-client';
import { CALCULATION_HEAT_KEYS } from '@/db/db.constants';
import SetPlayPlayoffDataModel from '@/db/models/games/set-play-playoff-data';
import SetPlaysDataModel from '@/db/models/games/set-plays-data';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import StartingLineupPlayoffModel from '@/db/models/games/starting-lineup-playoff';
import { SetPlayEnumType } from '@/db/models/schema.types';
import SetPlaysModel from '@/db/models/set-plays';
import UserModel from '@/db/models/user';

let userId: string;
let startingLineupId: string;
let playerIds: string[];
let setPlayId: string;
let setPlayIds: Map<SetPlayEnumType, string>;

async function clearFixtures() {
    await SetPlaysDataModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await SetPlayPlayoffDataModel.deleteMany();
    await StartingLineupPlayoffModel.deleteMany();
    await SetPlaysModel.deleteMany();
    await UserModel.deleteMany();
}

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await new DBClient().connect();
});

beforeEach(async () => {
    await clearFixtures();
    const user = await UserModel.create({
        username: 'playoff-user',
        coachName: 'Coach',
        email: 'playoff@example.com',
        password: 'Password1!',
        teamName: 'Team',
        logoUrl: 'https://example.com/logo.png'
    });
    userId = user._id.toString();
    playerIds = Array.from({ length: 5 }, () => {
        return new mongoose.Types.ObjectId().toString();
    });
    const startingLineup = await StartingLineupPlayoffModel.create({
        userId,
        roundNumber: 1,
        playerOne: playerIds[0],
        playerTwo: playerIds[1],
        playerThree: playerIds[2],
        playerFour: playerIds[3],
        playerFive: playerIds[4],
        roles: {
            pn: { playerId: playerIds[0], isDisabled: false },
            kb: playerIds[1],
            p: playerIds[2]
        }
    });
    startingLineupId = startingLineup._id.toString();
    const definitions = await SetPlaysModel.create(
        Object.values(SetPlayEnumType).map(type => {
            return { name: type === SetPlayEnumType.Ncd ? 'NCD' : type, type };
        })
    );
    setPlayIds = new Map(
        definitions.map(play => [play.type, play._id.toString()])
    );
    setPlayId = setPlayIds.get(SetPlayEnumType.Ncd)!;
});

afterAll(async () => {
    await clearFixtures();
    await mongoose.disconnect();
    jest.restoreAllMocks();
});

function selectedData(type = SetPlayEnumType.Ncd): SetPlayDataType {
    return {
        setPlayId: setPlayIds.get(type)!,
        ...([
            SetPlayEnumType.Ncd,
            SetPlayEnumType.Ncd6,
            SetPlayEnumType.GwarancjaStartow,
            SetPlayEnumType.Rezerwa,
            SetPlayEnumType.RezerwaGielda
        ].includes(type)
            ? { userData: { playerId: playerIds[0] } }
            : {})
    };
}

async function savePrediction() {
    return SetPlayPlayoffDataModel.saveSetPlay(
        startingLineupId,
        selectedData(),
        SetPlayEnumType.Ncd
    );
}

async function createRegularLineup() {
    const playoffLineup = await StartingLineupPlayoffModel.findById(
        startingLineupId
    )
        .orFail()
        .exec();
    return StartingLineupModel.create({
        ...playoffLineup.toObject(),
        _id: new mongoose.Types.ObjectId()
    });
}

async function createDanglingSelection() {
    const selected = await savePrediction();
    await SetPlaysModel.deleteOne({ _id: setPlayId });
    return selected;
}

describe('saveSetPlay', () => {
    test('Should throw when the starting lineup does not exist', async () => {
        const invalidId = new mongoose.Types.ObjectId().toString();
        await expect(
            SetPlayPlayoffDataModel.saveSetPlay(
                invalidId,
                selectedData(),
                SetPlayEnumType.Ncd
            )
        ).rejects.toThrow(`Invalid startingLineupId: ${invalidId}`);
    });

    test('Should reject a regular-season lineup ID', async () => {
        const regularLineup = await createRegularLineup();
        await expect(
            SetPlayPlayoffDataModel.saveSetPlay(
                regularLineup._id.toString(),
                selectedData(),
                SetPlayEnumType.Ncd
            )
        ).rejects.toThrow(`Invalid startingLineupId: ${regularLineup._id}`);
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([]);
    });

    test('Should propagate payload validation errors without creating a document', async () => {
        await expect(
            SetPlayPlayoffDataModel.saveSetPlay(
                startingLineupId,
                { setPlayId },
                SetPlayEnumType.Ncd
            )
        ).rejects.toThrow(ZodError);
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([]);
    });

    test.each([
        SetPlayEnumType.Ncd,
        SetPlayEnumType.Rezerwa,
        SetPlayEnumType.RezerwaGielda
    ])(
        'Should throw when %s has reached its occurrence limit without changing saved selections',
        async type => {
            const maximum = type === SetPlayEnumType.Ncd ? 2 : 1;
            for (let index = 0; index < maximum; index++) {
                await SetPlayPlayoffDataModel.saveSetPlay(
                    startingLineupId,
                    selectedData(type),
                    type
                );
            }
            const before =
                await SetPlayPlayoffDataModel.getSetPlaysForUser(
                    startingLineupId
                );
            await expect(
                SetPlayPlayoffDataModel.saveSetPlay(
                    startingLineupId,
                    selectedData(type),
                    type
                )
            ).rejects.toThrow(
                'Selected set play cannot be added due to megaliga setPlays rules'
            );
            expect(
                await SetPlayPlayoffDataModel.getSetPlaysForUser(
                    startingLineupId
                )
            ).toEqual(before);
        }
    );

    test('Should throw when six plays are already selected without changing saved selections', async () => {
        for (const type of [
            SetPlayEnumType.Ncd,
            SetPlayEnumType.Ncd6,
            SetPlayEnumType.Rezerwa,
            SetPlayEnumType.RezerwaGielda,
            SetPlayEnumType.Muchomor,
            SetPlayEnumType.PauloSousa
        ]) {
            await SetPlayPlayoffDataModel.saveSetPlay(
                startingLineupId,
                selectedData(type),
                type
            );
        }
        const before =
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId);
        await expect(
            SetPlayPlayoffDataModel.saveSetPlay(
                startingLineupId,
                selectedData(),
                SetPlayEnumType.Ncd
            )
        ).rejects.toThrow(
            'Selected set play cannot be added due to megaliga setPlays rules'
        );
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual(before);
    });

    test('Should create playoff selections and append a second prediction without overwriting the first', async () => {
        const first = await savePrediction();
        const second = await SetPlayPlayoffDataModel.saveSetPlay(
            startingLineupId,
            { setPlayId, userData: { playerId: playerIds[1] } },
            SetPlayEnumType.Ncd
        );
        expect(first).toEqual([
            {
                selectedSetPlayId: expect.any(String),
                setPlayId,
                name: 'NCD',
                type: SetPlayEnumType.Ncd,
                userData: { playerId: playerIds[0] }
            }
        ]);
        expect(second).toEqual([
            first[0],
            {
                selectedSetPlayId: expect.any(String),
                setPlayId,
                name: 'NCD',
                type: SetPlayEnumType.Ncd,
                userData: { playerId: playerIds[1] }
            }
        ]);
        expect(second[0].selectedSetPlayId).not.toBe(
            second[1].selectedSetPlayId
        );
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual(second);
    });
});

describe('saveSelectedSetPlay', () => {
    test('Should reject a missing set-play definition before saving', async () => {
        const document = new SetPlayPlayoffDataModel({
            startingLineupId,
            setPlayList: [
                {
                    setPlayId: new mongoose.Types.ObjectId(),
                    userData: { playerId: playerIds[0] }
                }
            ]
        });
        await expect(document.saveSelectedSetPlay()).rejects.toThrow(
            'Set play with provided setPlayId does not exists'
        );
    });

    test('Should enforce occurrence constraints when saving the selected array directly', async () => {
        const document = new SetPlayPlayoffDataModel({
            startingLineupId,
            setPlayList: Array.from({ length: 3 }, () => selectedData())
        });
        await expect(document.saveSelectedSetPlay()).rejects.toThrow(
            'ncd may be selected at most 2 time(s) per round'
        );
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([]);
    });

    test('Should save the first selected set play and return the mapped setPlayList', async () => {
        const document = new SetPlayPlayoffDataModel({
            startingLineupId,
            setPlayList: [selectedData()]
        });
        const selected = await document.saveSelectedSetPlay();
        expect(selected).toEqual([
            {
                selectedSetPlayId: expect.any(String),
                setPlayId,
                name: 'NCD',
                type: SetPlayEnumType.Ncd,
                userData: { playerId: playerIds[0] }
            }
        ]);
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual(selected);
    });

    test('Should save an appended set play of the same type without overwriting the existing selection', async () => {
        const before = await savePrediction();
        const document = await SetPlayPlayoffDataModel.findOne({
            startingLineupId
        })
            .orFail()
            .exec();
        document.set('setPlayList', [
            ...document.setPlayList,
            {
                setPlayId,
                userData: { playerId: playerIds[1] }
            }
        ]);
        const after = await document.saveSelectedSetPlay();
        expect(after).toEqual([
            before[0],
            {
                selectedSetPlayId: expect.any(String),
                setPlayId,
                name: 'NCD',
                type: SetPlayEnumType.Ncd,
                userData: { playerId: playerIds[1] }
            }
        ]);
    });
});

describe('updateSetPlay', () => {
    test('Should throw when no set plays document exists for the starting lineup', async () => {
        await expect(
            SetPlayPlayoffDataModel.updateSetPlay(
                startingLineupId,
                new mongoose.Types.ObjectId().toString(),
                selectedData()
            )
        ).rejects.toThrow('No set plays for starting lineup');
    });

    test('Should throw when the selected item does not exist', async () => {
        await savePrediction();
        await expect(
            SetPlayPlayoffDataModel.updateSetPlay(
                startingLineupId,
                new mongoose.Types.ObjectId().toString(),
                selectedData()
            )
        ).rejects.toThrow('Selected set play not found');
    });

    test('Should propagate payload validation errors without changing saved selected set plays', async () => {
        const before = await savePrediction();
        await expect(
            SetPlayPlayoffDataModel.updateSetPlay(
                startingLineupId,
                before[0].selectedSetPlayId,
                { setPlayId }
            )
        ).rejects.toThrow(ZodError);
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual(before);
    });

    test('Should update selected set play data and return the complete mapped list with two selections of different types', async () => {
        await savePrediction();
        const before = await SetPlayPlayoffDataModel.saveSetPlay(
            startingLineupId,
            selectedData(SetPlayEnumType.Ncd6),
            SetPlayEnumType.Ncd6
        );
        const after = await SetPlayPlayoffDataModel.updateSetPlay(
            startingLineupId,
            before[0].selectedSetPlayId,
            { setPlayId, userData: { playerId: playerIds[2] } }
        );
        expect(after).toEqual([
            { ...before[0], userData: { playerId: playerIds[2] } },
            before[1]
        ]);
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual(after);
    });
});

describe('removeSetPlay', () => {
    test('Should throw when no set plays document exists for the starting lineup', async () => {
        await expect(
            SetPlayPlayoffDataModel.removeSetPlay(
                startingLineupId,
                new mongoose.Types.ObjectId().toString()
            )
        ).rejects.toThrow('No set plays for starting lineup');
    });

    test('Should throw when the selected item does not exist', async () => {
        await savePrediction();
        await expect(
            SetPlayPlayoffDataModel.removeSetPlay(
                startingLineupId,
                new mongoose.Types.ObjectId().toString()
            )
        ).rejects.toThrow('Selected set play not found');
    });

    test('Should remove only the requested playoff item and keep regular-season selections unchanged', async () => {
        const regularLineup = await createRegularLineup();
        const regular = await SetPlaysDataModel.saveSetPlay(
            regularLineup._id.toString(),
            selectedData(),
            SetPlayEnumType.Ncd
        );
        await savePrediction();
        const before = await SetPlayPlayoffDataModel.saveSetPlay(
            startingLineupId,
            selectedData(SetPlayEnumType.Ncd6),
            SetPlayEnumType.Ncd6
        );
        expect(
            await SetPlayPlayoffDataModel.removeSetPlay(
                startingLineupId,
                before[0].selectedSetPlayId
            )
        ).toEqual([before[1]]);
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([before[1]]);
        expect(
            await SetPlaysDataModel.getSetPlaysForUser(
                regularLineup._id.toString()
            )
        ).toEqual(regular);
    });

    test('Should remove the last selected set play and return an empty list', async () => {
        const before = await savePrediction();
        expect(
            await SetPlayPlayoffDataModel.removeSetPlay(
                startingLineupId,
                before[0].selectedSetPlayId
            )
        ).toEqual([]);
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([]);
    });
});

describe('getSetPlayListByStartingLineupId', () => {
    test('Should throw when a selected set-play reference cannot be populated', async () => {
        await createDanglingSelection();
        await expect(
            SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            )
        ).rejects.toThrow();
    });

    test('Should return an empty list when no set plays document exists for the starting lineup', async () => {
        expect(
            await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            )
        ).toEqual({ setPlayList: [] });
    });

    test('Should return an empty list when the selected set play list is empty', async () => {
        await SetPlayPlayoffDataModel.create({ startingLineupId });
        expect(
            await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            )
        ).toEqual({ setPlayList: [] });
    });

    test('Should return selected set plays for given startingLineupId', async () => {
        const selected = await savePrediction();
        const adminData = { playerIdList: playerIds.slice(0, 4) };
        await SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, [
            { ...selected[0], adminData }
        ]);
        expect(
            await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            )
        ).toEqual({ setPlayList: [{ ...selected[0], adminData }] });
    });
});

describe('getSetPlaysForUser', () => {
    test('Should throw when a selected set-play definition is missing', async () => {
        await createDanglingSelection();
        await expect(
            SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).rejects.toThrow('Missing catalog entry for selected set play');
    });

    test('Should return an empty list when no set plays document exists for the starting lineup', async () => {
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([]);
    });

    test('Should return an empty list when the selected set play list is empty', async () => {
        await SetPlayPlayoffDataModel.create({ startingLineupId });
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([]);
    });

    test('Should return selected set play IDs, types, names and user inputs for the requested startingLineupId', async () => {
        const selected = await savePrediction();
        await SetPlayPlayoffDataModel.saveSetPlay(
            startingLineupId,
            selectedData(SetPlayEnumType.Remis),
            SetPlayEnumType.Remis
        );
        await SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, [
            {
                ...selected[0],
                adminData: { playerIdList: playerIds.slice(0, 4) }
            }
        ]);
        const result =
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId);
        expect(result).toEqual([
            selected[0],
            {
                selectedSetPlayId: expect.any(String),
                setPlayId: setPlayIds.get(SetPlayEnumType.Remis),
                name: SetPlayEnumType.Remis,
                type: SetPlayEnumType.Remis,
                userData: null
            }
        ]);
    });
});

describe('getSetPlaysForAdmin', () => {
    test.each([0, 5])(
        'Should throw error for playoff round %i outside 1 - 4',
        async round => {
            await expect(
                SetPlayPlayoffDataModel.getSetPlaysForAdmin(round, userId)
            ).rejects.toThrow(
                `Invalid roundNumber: ${round}. Must be between 1 and 4`
            );
        }
    );

    test('Should throw for a nonexistent user', async () => {
        const unknownUserId = new mongoose.Types.ObjectId().toString();
        await expect(
            SetPlayPlayoffDataModel.getSetPlaysForAdmin(1, unknownUserId)
        ).rejects.toThrow(`Invalid userId: ${unknownUserId}`);
    });

    test('Should throw when a selected set-play definition is missing', async () => {
        await createDanglingSelection();
        await expect(
            SetPlayPlayoffDataModel.getSetPlaysForAdmin(1, userId)
        ).rejects.toThrow('Missing catalog entry for selected set play');
    });

    test('Should return an empty list when the starting lineup does not exist', async () => {
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForAdmin(4, userId)
        ).toEqual([]);
    });

    test('Should return an empty list when no set plays document exists for the starting lineup', async () => {
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForAdmin(1, userId)
        ).toEqual([]);
    });

    test('Should return an empty list when the selected set play list is empty', async () => {
        await SetPlayPlayoffDataModel.create({ startingLineupId });
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForAdmin(1, userId)
        ).toEqual([]);
    });

    test.each([1, 4])(
        'Should return admin form item IDs and default Remis checkboxes for boundary round %i',
        async round => {
            await StartingLineupPlayoffModel.updateOne(
                { _id: startingLineupId },
                { roundNumber: round }
            );
            await savePrediction();
            const selected = await SetPlayPlayoffDataModel.saveSetPlay(
                startingLineupId,
                selectedData(SetPlayEnumType.Remis),
                SetPlayEnumType.Remis
            );
            expect(
                await SetPlayPlayoffDataModel.getSetPlaysForAdmin(round, userId)
            ).toEqual([
                {
                    selectedSetPlayId: selected[0].selectedSetPlayId,
                    setPlayId,
                    name: 'NCD',
                    type: SetPlayEnumType.Ncd,
                    adminData: null
                },
                {
                    selectedSetPlayId: selected[1].selectedSetPlayId,
                    setPlayId: setPlayIds.get(SetPlayEnumType.Remis),
                    name: SetPlayEnumType.Remis,
                    type: SetPlayEnumType.Remis,
                    adminData: Object.fromEntries(
                        playerIds.map(id => [id, false])
                    )
                }
            ]);
        }
    );
});

describe('saveAdminSetPlay', () => {
    test.each(['0', '5', '1.5'])(
        'Should throw for invalid round %s',
        async round => {
            await expect(
                SetPlayPlayoffDataModel.saveAdminSetPlay(round, userId, [
                    selectedData()
                ])
            ).rejects.toThrow(
                `Invalid roundNumber: ${round}. Must be between 1 and 4`
            );
        }
    );

    test('Should throw for a nonexistent user', async () => {
        const unknownUserId = new mongoose.Types.ObjectId().toString();
        await expect(
            SetPlayPlayoffDataModel.saveAdminSetPlay('1', unknownUserId, [
                selectedData()
            ])
        ).rejects.toThrow(`Invalid userId: ${unknownUserId}`);
    });

    test('Should throw when no starting lineup exists for the user and round', async () => {
        await expect(
            SetPlayPlayoffDataModel.saveAdminSetPlay('4', userId, [
                selectedData()
            ])
        ).rejects.toThrow('No starting lineup for user and round');
    });

    test('Should throw when no set plays document exists for the starting lineup', async () => {
        await expect(
            SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, [
                selectedData()
            ])
        ).rejects.toThrow('No set plays for starting lineup');
    });

    test('Should reject an unknown selected item ID without changing saved data', async () => {
        const selected = await savePrediction();
        await expect(
            SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, [
                {
                    ...selected[0],
                    selectedSetPlayId: new mongoose.Types.ObjectId().toString(),
                    adminData: { playerIdList: playerIds.slice(0, 4) }
                }
            ])
        ).rejects.toThrow('Selected set play not found');
        expect(
            await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            )
        ).toEqual({ setPlayList: selected });
    });

    test('Should reject invalid admin data without saving any submitted update', async () => {
        await savePrediction();
        const selected = await SetPlayPlayoffDataModel.saveSetPlay(
            startingLineupId,
            selectedData(SetPlayEnumType.Ncd6),
            SetPlayEnumType.Ncd6
        );
        await expect(
            SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, [
                {
                    ...selected[0],
                    adminData: { playerIdList: playerIds.slice(0, 4) }
                },
                {
                    ...selected[1],
                    adminData: { playerIdList: playerIds.slice(0, 3) }
                }
            ])
        ).rejects.toThrow('Four players are required');
        expect(
            await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            )
        ).toEqual({ setPlayList: selected });
    });

    test('Should accept an empty submission without changing selections', async () => {
        const selected = await savePrediction();
        await expect(
            SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, [])
        ).resolves.toBeUndefined();
        expect(
            await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            )
        ).toEqual({ setPlayList: selected });
    });

    test.each([1, 4])(
        'Should save only the requested playoff user and round %i and preserve regular-season admin data',
        async round => {
            const originalLineup = await StartingLineupPlayoffModel.findById(
                startingLineupId
            )
                .orFail()
                .exec();
            const fields = originalLineup.toObject();
            await StartingLineupPlayoffModel.deleteOne({
                _id: startingLineupId
            });
            const otherRound = round === 1 ? 4 : 1;
            const otherUser = await UserModel.create({
                username: 'other-playoff-user',
                coachName: 'Other coach',
                email: 'other-playoff@example.com',
                password: 'Password1!',
                teamName: 'Other team',
                logoUrl: 'https://example.com/logo.png'
            });
            const otherUserLineup = await StartingLineupPlayoffModel.create({
                ...fields,
                _id: new mongoose.Types.ObjectId(),
                userId: otherUser._id,
                roundNumber: round
            });
            const otherRoundLineup = await StartingLineupPlayoffModel.create({
                ...fields,
                _id: new mongoose.Types.ObjectId(),
                roundNumber: otherRound
            });
            const targetLineup = await StartingLineupPlayoffModel.create({
                ...fields,
                _id: new mongoose.Types.ObjectId(),
                roundNumber: round
            });
            startingLineupId = targetLineup._id.toString();
            const otherUserSelected = await SetPlayPlayoffDataModel.saveSetPlay(
                otherUserLineup._id.toString(),
                selectedData(),
                SetPlayEnumType.Ncd
            );
            const otherRoundSelected =
                await SetPlayPlayoffDataModel.saveSetPlay(
                    otherRoundLineup._id.toString(),
                    selectedData(),
                    SetPlayEnumType.Ncd
                );
            const regularLineup = await createRegularLineup();
            const regular = await SetPlaysDataModel.saveSetPlay(
                regularLineup._id.toString(),
                selectedData(),
                SetPlayEnumType.Ncd
            );
            await SetPlaysDataModel.saveAdminSetPlay(String(round), userId, [
                {
                    ...regular[0],
                    adminData: { playerIdList: playerIds.slice(1, 5) }
                }
            ]);
            const regularBefore =
                await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                    regularLineup._id.toString()
                );
            const selected = await savePrediction();
            const adminData = { playerIdList: playerIds.slice(0, 4) };
            await SetPlayPlayoffDataModel.saveAdminSetPlay(
                String(round),
                userId,
                [{ ...selected[0], adminData }]
            );
            expect(
                await SetPlayPlayoffDataModel.getSetPlaysForAdmin(round, userId)
            ).toEqual([
                {
                    selectedSetPlayId: selected[0].selectedSetPlayId,
                    setPlayId,
                    name: 'NCD',
                    type: SetPlayEnumType.Ncd,
                    adminData
                }
            ]);
            expect(
                await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                    otherUserLineup._id.toString()
                )
            ).toEqual({ setPlayList: otherUserSelected });
            expect(
                await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                    otherRoundLineup._id.toString()
                )
            ).toEqual({ setPlayList: otherRoundSelected });
            expect(
                await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                    regularLineup._id.toString()
                )
            ).toEqual(regularBefore);
        }
    );

    test('Should save complete admin form data and retain Awatar average, draw and disable flags', async () => {
        const definitions = [
            { type: SetPlayEnumType.Ncd, userData: { playerId: playerIds[0] } },
            {
                type: SetPlayEnumType.Ncd6,
                userData: { playerId: playerIds[1] }
            },
            { type: SetPlayEnumType.Remis },
            {
                type: SetPlayEnumType.Spartacus,
                userData: {
                    ownPlayerId: playerIds[0],
                    opponentPlayerId: playerIds[4]
                }
            },
            {
                type: SetPlayEnumType.BrudnaPala,
                userData: { leaderIdList: playerIds.slice(0, 4) }
            },
            {
                type: SetPlayEnumType.Awatar,
                userData: {
                    playerId: new mongoose.Types.ObjectId().toString(),
                    replacedPlayerId: playerIds[2]
                }
            }
        ];
        for (const entry of definitions) {
            await SetPlayPlayoffDataModel.saveSetPlay(
                startingLineupId,
                {
                    setPlayId: setPlayIds.get(entry.type)!,
                    userData: entry.userData
                },
                entry.type
            );
        }
        const { setPlayList } =
            await SetPlayPlayoffDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            );
        const remisResults = Object.fromEntries(
            playerIds.map((id, index) => [id, index === 1])
        );
        const leaderResults = Object.fromEntries(
            playerIds.slice(0, 4).map((id, index) => [id, index === 0])
        );
        const awatarData = {
            ...Object.fromEntries(
                CALCULATION_HEAT_KEYS.map(key => {
                    return [
                        key,
                        { value: null, bonus: false, isNominated: false }
                    ];
                })
            ),
            heatOne: { value: 2, bonus: true, isNominated: false },
            heatTwo: { value: 0, bonus: false, isNominated: true },
            average: 0,
            isMatchDraw: true,
            isDisabled: true
        };
        const adminData: NonNullable<SetPlayDataType['adminData']>[] = [
            { playerIdList: playerIds.slice(0, 4) },
            { playerIdList: playerIds.slice(1, 5) },
            remisResults,
            { ownAverage: 1.08, opponentAverage: 1.5 },
            { isDisabled: true, playerResults: leaderResults },
            awatarData
        ];
        const submission = setPlayList.map((play, index) => {
            return { ...play, adminData: adminData[index] };
        });
        await expect(
            SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, submission)
        ).resolves.toBeUndefined();
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForAdmin(1, userId)
        ).toEqual(
            setPlayList.map((play, index) => {
                return {
                    selectedSetPlayId: play.selectedSetPlayId,
                    setPlayId: play.setPlayId,
                    name: play.name,
                    type: play.type,
                    adminData: adminData[index]
                };
            })
        );
        expect(
            await SetPlayPlayoffDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual(
            setPlayList.map(play => {
                return {
                    selectedSetPlayId: play.selectedSetPlayId,
                    setPlayId: play.setPlayId,
                    name: play.name,
                    type: play.type,
                    userData: 'userData' in play ? play.userData : null
                };
            })
        );
        const enabledAwatarData = {
            ...awatarData,
            isDisabled: false,
            isMatchDraw: false,
            average: 1.5
        };
        await SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, [
            { ...submission[5], adminData: enabledAwatarData },
            {
                ...submission[4],
                adminData: { isDisabled: false, playerResults: leaderResults }
            },
            { ...setPlayList[0], adminData: undefined }
        ]);
        const after = await SetPlayPlayoffDataModel.getSetPlaysForAdmin(
            1,
            userId
        );
        expect(after[5].adminData).toEqual(enabledAwatarData);
        expect(after[4].adminData).toEqual({
            isDisabled: false,
            playerResults: leaderResults
        });
        expect(after[0].adminData).toEqual(adminData[0]);
    });

    test.each([SetPlayEnumType.Rezerwa, SetPlayEnumType.RezerwaGielda])(
        'Should preserve %s heat values and flags and replace omitted submitted heats with null',
        async type => {
            const selected = await SetPlayPlayoffDataModel.saveSetPlay(
                startingLineupId,
                selectedData(type),
                type
            );
            const adminData = {
                ...Object.fromEntries(
                    CALCULATION_HEAT_KEYS.map(key => {
                        return [
                            key,
                            { value: null, bonus: false, isNominated: false }
                        ];
                    })
                ),
                heatOne: { value: 0, bonus: false, isNominated: false },
                heatTwo: { value: 2, bonus: true, isNominated: true }
            };
            await SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, [
                { ...selected[0], adminData }
            ]);
            expect(
                (
                    await SetPlayPlayoffDataModel.getSetPlaysForAdmin(1, userId)
                )[0].adminData
            ).toEqual(adminData);
            await SetPlayPlayoffDataModel.saveAdminSetPlay('1', userId, [
                {
                    ...selected[0],
                    adminData: {
                        heatOne: { value: 3, bonus: false, isNominated: false }
                    }
                }
            ]);
            expect(
                (
                    await SetPlayPlayoffDataModel.getSetPlaysForAdmin(1, userId)
                )[0].adminData
            ).toEqual({
                ...Object.fromEntries(
                    CALCULATION_HEAT_KEYS.map(key => {
                        return [
                            key,
                            { value: null, bonus: false, isNominated: false }
                        ];
                    })
                ),
                heatOne: { value: 3, bonus: false, isNominated: false }
            });
        }
    );
});
