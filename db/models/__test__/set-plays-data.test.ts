import type {
    SetPlayDataType,
    SetPlaysDataSelectionReturnType
} from '@/db/models/games/set-plays-data';

import mongoose from 'mongoose';
import { ZodError } from 'zod';

import { DBClient } from '@/db/db-client';
import SetPlaysDataModel from '@/db/models/games/set-plays-data';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import { SetPlayEnumType } from '@/db/models/schema.types';
import SetPlaysModel from '@/db/models/set-plays';
import UserModel from '@/db/models/user';

const catalogNames: Record<SetPlayEnumType, string> = {
    [SetPlayEnumType.Remis]: 'Remis',
    [SetPlayEnumType.GwarancjaStartow]: 'Gwarancja startów',
    [SetPlayEnumType.BrudnaPala]: 'Brudna pała',
    [SetPlayEnumType.Ncd6]: 'NCD6',
    [SetPlayEnumType.Muchomor]: 'Muchomor',
    [SetPlayEnumType.Ncd]: 'NCD',
    [SetPlayEnumType.Rezerwa]: 'Rezerwa',
    [SetPlayEnumType.RezerwaGielda]: 'Rezerwa giełda',
    [SetPlayEnumType.RyszardKowalski]: 'Ryszard Kowalski',
    [SetPlayEnumType.Spartacus]: 'Spartacus',
    [SetPlayEnumType.Typer]: 'Typer',
    [SetPlayEnumType.Awatar]: 'Awatar',
    [SetPlayEnumType.KoloFortunyNorbiego]: 'Koło Fortuny Norbiego',
    [SetPlayEnumType.MortalKombatCombo]: 'Mortal Kombat Combo',
    [SetPlayEnumType.PijanyCieslak]: 'Pijany Cieślak',
    [SetPlayEnumType.PauloSousa]: 'Paulo Sousa',
    [SetPlayEnumType.Taktyczna]: 'Taktyczna'
};
let setPlayIds: Map<SetPlayEnumType, string>;

function getSetPlayId(type: SetPlayEnumType): string {
    const id = setPlayIds.get(type);
    if (!id) {
        throw new Error('Missing set play fixture');
    }
    return id;
}

let startingLineupId: string;
let opponentStartingLineupId: string;
let ownPlayerIds: string[];
let opponentPlayerIds: string[];
let marketPlayerId: string;
let ownUserId: string;
let opponentUserId: string;

async function addSelectedSetPlays(
    startingLineupId: string,
    setPlayData: SetPlayDataType[]
): Promise<SetPlaysDataSelectionReturnType[]> {
    let selectedSetPlays: SetPlaysDataSelectionReturnType[] = [];
    for (const play of setPlayData) {
        const type = [...setPlayIds].find(
            ([, id]) => id === play.setPlayId
        )?.[0];
        if (!type) {
            throw new Error('Missing set-play type fixture');
        }
        selectedSetPlays = await SetPlaysDataModel.saveSetPlay(
            startingLineupId,
            play,
            type
        );
    }
    return selectedSetPlays;
}

async function getStoredSetPlays(startingLineupId: string) {
    const { setPlayList } =
        await SetPlaysDataModel.getSetPlayListByStartingLineupId(
            startingLineupId
        );
    return setPlayList;
}

function remisAdminData(checkedPlayerIds: string[] = []) {
    return Object.fromEntries(
        ownPlayerIds.slice(0, 5).map(playerId => {
            return [playerId, checkedPlayerIds.includes(playerId)];
        })
    );
}

function brudnaPalaAdminData(checkedPlayerIds: string[] = []) {
    return {
        isDisabled: false,
        playerResults: Object.fromEntries(
            ownPlayerIds.slice(0, 4).map(playerId => {
                return [playerId, checkedPlayerIds.includes(playerId)];
            })
        )
    };
}

const clearFixtures = async () => {
    await SetPlaysDataModel.deleteMany();
    await SetPlaysModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await UserModel.deleteMany();
};

const createStartingLineup = async (
    userId: string,
    players: string[],
    roundNumber = 2
) => {
    return StartingLineupModel.create({
        userId,
        roundNumber,
        playerOne: players[0],
        playerTwo: players[1],
        playerThree: players[2],
        playerFour: players[3],
        playerFive: players[4],
        roles: { pn: { playerId: players[0], isDisabled: false }, kb: players[1], p: players[2] }
    });
};

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await new DBClient().connect();
    await SetPlaysDataModel.init();
});

beforeEach(async () => {
    await clearFixtures();
    const setPlayList = await SetPlaysModel.create(
        Object.values(SetPlayEnumType).map(type => {
            return { type, name: catalogNames[type] };
        })
    );
    setPlayIds = new Map(
        setPlayList.map(play => [play.type, play._id.toString()])
    );
    const users = await UserModel.create(
        [0, 1].map(index => {
            return {
                username: `set-play-user-${index}`,
                coachName: `Coach ${index}`,
                email: `set-play-${index}@example.com`,
                password: 'Password1!',
                teamName: `Team ${index}`,
                logoUrl: 'https://example.com/logo.png'
            };
        })
    );
    ownUserId = users[0]._id.toString();
    opponentUserId = users[1]._id.toString();
    ownPlayerIds = Array.from({ length: 6 }, () => {
        return new mongoose.Types.ObjectId().toString();
    });
    opponentPlayerIds = Array.from({ length: 6 }, () => {
        return new mongoose.Types.ObjectId().toString();
    });
    marketPlayerId = new mongoose.Types.ObjectId().toString();
    const startingLineup = await createStartingLineup(ownUserId, ownPlayerIds);
    const opponentStartingLineup = await createStartingLineup(
        opponentUserId,
        opponentPlayerIds
    );
    startingLineupId = startingLineup._id.toString();
    opponentStartingLineupId = opponentStartingLineup._id.toString();
});

afterAll(async () => {
    await clearFixtures();
    await mongoose.disconnect();
    jest.restoreAllMocks();
});

async function createDanglingSetPlay() {
    await SetPlaysDataModel.create({
        startingLineupId: startingLineupId,
        setPlayList: [{ setPlayId: getSetPlayId(SetPlayEnumType.Remis) }]
    });
    await SetPlaysModel.deleteOne({ _id: getSetPlayId(SetPlayEnumType.Remis) });
}

describe('saveSetPlay', () => {
    test('Should throw when the starting lineup does not exist', async () => {
        const startingLineupId = new mongoose.Types.ObjectId().toString();
        await expect(
            SetPlaysDataModel.saveSetPlay(
                startingLineupId,
                { setPlayId: getSetPlayId(SetPlayEnumType.Remis) },
                SetPlayEnumType.Remis
            )
        ).rejects.toThrow(`Invalid startingLineupId: ${startingLineupId}`);
        expect(await getStoredSetPlays(startingLineupId)).toEqual([]);
    });

    test('Should throw when six plays are already selected without changing saved selections', async () => {
        const six: SetPlayDataType[] = [
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Ncd),
                userData: { playerId: ownPlayerIds[0] }
            },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Ncd),
                userData: { playerId: ownPlayerIds[0] }
            },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Ncd6),
                userData: { playerId: ownPlayerIds[1] }
            },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Ncd6),
                userData: { playerId: ownPlayerIds[1] }
            },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Rezerwa),
                userData: { playerId: ownPlayerIds[5] }
            },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.RezerwaGielda),
                userData: { playerId: marketPlayerId }
            }
        ];
        const saved = await addSelectedSetPlays(startingLineupId, six);
        await expect(
            SetPlaysDataModel.saveSetPlay(
                startingLineupId,
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Muchomor)
                },
                SetPlayEnumType.Muchomor
            )
        ).rejects.toThrow(
            'Selected set play cannot be added due to megaliga setPlays rules'
        );
        expect(await getStoredSetPlays(startingLineupId)).toEqual(saved);
    });

    test.each([
        [SetPlayEnumType.Remis, 2],
        [SetPlayEnumType.Rezerwa, 1],
        [SetPlayEnumType.RezerwaGielda, 1]
    ])(
        'Should throw when %s has reached its occurrence limit without changing saved selections',
        async (type, maximum) => {
            const setPlayData: SetPlayDataType = {
                setPlayId: getSetPlayId(type),
                ...(type === SetPlayEnumType.Rezerwa
                    ? { userData: { playerId: ownPlayerIds[5] } }
                    : {}),
                ...(type === SetPlayEnumType.RezerwaGielda
                    ? { userData: { playerId: marketPlayerId } }
                    : {})
            };
            const saved = await addSelectedSetPlays(
                startingLineupId,
                Array.from({ length: maximum }, () => setPlayData)
            );
            await expect(
                SetPlaysDataModel.saveSetPlay(
                    startingLineupId,
                    setPlayData,
                    type
                )
            ).rejects.toThrow(
                'Selected set play cannot be added due to megaliga setPlays rules'
            );
            expect(await getStoredSetPlays(startingLineupId)).toEqual(saved);
        }
    );

    test('Should count different set-play definitions of the same type toward the same limit', async () => {
        await addSelectedSetPlays(startingLineupId, [
            { setPlayId: getSetPlayId(SetPlayEnumType.Remis) },
            { setPlayId: getSetPlayId(SetPlayEnumType.Remis) }
        ]);
        const anotherDraw = await SetPlaysModel.create({
            name: 'Remis – drugi wpis',
            type: SetPlayEnumType.Remis
        });
        const saved = await getStoredSetPlays(startingLineupId);
        await expect(
            SetPlaysDataModel.saveSetPlay(
                startingLineupId,
                { setPlayId: anotherDraw._id.toString() },
                SetPlayEnumType.Remis
            )
        ).rejects.toThrow(
            'Selected set play cannot be added due to megaliga setPlays rules'
        );
        expect(await getStoredSetPlays(startingLineupId)).toEqual(saved);
    });

    test('Should propagate payload validation errors without creating a document', async () => {
        await expect(
            SetPlaysDataModel.saveSetPlay(
                startingLineupId,
                { setPlayId: getSetPlayId(SetPlayEnumType.Rezerwa) },
                SetPlayEnumType.Rezerwa
            )
        ).rejects.toThrow(ZodError);
        expect(await getStoredSetPlays(startingLineupId)).toEqual([]);
    });

    test.each([
        SetPlayEnumType.Ncd,
        SetPlayEnumType.Ncd6,
        SetPlayEnumType.Awatar
    ])('Should reject %s without its required rider selection', async type => {
        await expect(
            SetPlaysDataModel.saveSetPlay(
                startingLineupId,
                {
                    setPlayId: getSetPlayId(type),
                    ...(type === SetPlayEnumType.Awatar
                        ? { userData: { playerId: marketPlayerId } }
                        : {})
                },
                type
            )
        ).rejects.toThrow(ZodError);
        expect(await getStoredSetPlays(startingLineupId)).toEqual([]);
    });

    test('Should create new set-plays-data document and add first selected set play', async () => {
        const setPlayData = {
            setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
            userData: { playerId: ownPlayerIds[0] }
        };
        const saved = await SetPlaysDataModel.saveSetPlay(
            startingLineupId,
            setPlayData,
            SetPlayEnumType.GwarancjaStartow
        );
        expect(saved).toEqual([
            {
                selectedSetPlayId: expect.any(String),
                ...setPlayData,
                name: 'Gwarancja startów',
                type: SetPlayEnumType.GwarancjaStartow
            }
        ]);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(saved);
    });

    test('Should append selected set play to setPlayList on existing document', async () => {
        const existingSetPlayData = {
            setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
            userData: { playerId: ownPlayerIds[0] }
        };
        const existingDocument = await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [existingSetPlayData]
        });
        const setPlayData = {
            setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
            userData: { playerId: ownPlayerIds[1] }
        };
        const saved = await SetPlaysDataModel.saveSetPlay(
            startingLineupId,
            setPlayData,
            SetPlayEnumType.GwarancjaStartow
        );
        expect(saved).toEqual([
            {
                selectedSetPlayId:
                    existingDocument.setPlayList[0]._id.toString(),
                ...existingSetPlayData,
                name: 'Gwarancja startów',
                type: SetPlayEnumType.GwarancjaStartow
            },
            {
                selectedSetPlayId: expect.any(String),
                ...setPlayData,
                name: 'Gwarancja startów',
                type: SetPlayEnumType.GwarancjaStartow
            }
        ]);
        expect(saved[1].selectedSetPlayId).not.toBe(saved[0].selectedSetPlayId);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(saved);
    });
});

describe('updateSetPlay', () => {
    test('Should throw when no set plays document exists for the starting lineup', async () => {
        await expect(
            SetPlaysDataModel.updateSetPlay(
                startingLineupId,
                new mongoose.Types.ObjectId().toString(),
                { setPlayId: getSetPlayId(SetPlayEnumType.Remis) }
            )
        ).rejects.toThrow('No set plays for starting lineup');
        expect(await getStoredSetPlays(startingLineupId)).toEqual([]);
        expect(await SetPlaysDataModel.exists({ startingLineupId })).toBeNull();
    });

    test('Should throw when the selected set play list is empty', async () => {
        await SetPlaysDataModel.create({ startingLineupId, setPlayList: [] });

        await expect(
            SetPlaysDataModel.updateSetPlay(
                startingLineupId,
                new mongoose.Types.ObjectId().toString(),
                { setPlayId: getSetPlayId(SetPlayEnumType.Remis) }
            )
        ).rejects.toThrow('Selected set play not found');
        expect(await getStoredSetPlays(startingLineupId)).toEqual([]);
    });

    test('Should throw when the selected set play belongs to another starting lineup', async () => {
        await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [{ setPlayId: getSetPlayId(SetPlayEnumType.Remis) }]
        });
        const otherDocument = await SetPlaysDataModel.create({
            startingLineupId: opponentStartingLineupId,
            setPlayList: [{ setPlayId: getSetPlayId(SetPlayEnumType.Remis) }]
        });
        const before = await getStoredSetPlays(startingLineupId);
        const otherBefore = await getStoredSetPlays(opponentStartingLineupId);

        await expect(
            SetPlaysDataModel.updateSetPlay(
                startingLineupId,
                otherDocument.setPlayList[0]._id.toString(),
                { setPlayId: getSetPlayId(SetPlayEnumType.Muchomor) }
            )
        ).rejects.toThrow('Selected set play not found');
        expect(await getStoredSetPlays(startingLineupId)).toEqual(before);
        expect(await getStoredSetPlays(opponentStartingLineupId)).toEqual(
            otherBefore
        );
    });

    test('Should propagate payload validation errors without changing saved selected set plays', async () => {
        await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                    userData: { playerId: ownPlayerIds[0] }
                }
            ]
        });
        const before = await getStoredSetPlays(startingLineupId);

        await expect(
            SetPlaysDataModel.updateSetPlay(
                startingLineupId,
                before[0].selectedSetPlayId,
                { setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow) }
            )
        ).rejects.toThrow(ZodError);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(before);
    });

    test.each([
        { scenario: 'one selection', otherType: undefined },
        {
            scenario: 'two selections of the same type',
            otherType: SetPlayEnumType.GwarancjaStartow
        },
        {
            scenario: 'two selections of different types',
            otherType: SetPlayEnumType.RyszardKowalski
        }
    ])(
        'Should update selected set play data and return the complete mapped list with $scenario',
        async ({ otherType }) => {
            await SetPlaysDataModel.create({
                startingLineupId,
                setPlayList: [
                    {
                        setPlayId: getSetPlayId(
                            SetPlayEnumType.GwarancjaStartow
                        ),
                        userData: { playerId: ownPlayerIds[0] }
                    },
                    ...(otherType
                        ? [
                              {
                                  setPlayId: getSetPlayId(otherType),
                                  userData: { playerId: ownPlayerIds[1] }
                              }
                          ]
                        : [])
                ]
            });
            const before = await getStoredSetPlays(startingLineupId);

            const updated = await SetPlaysDataModel.updateSetPlay(
                startingLineupId,
                before[0].selectedSetPlayId,
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                    userData: { playerId: ownPlayerIds[2] }
                }
            );

            expect(updated).toEqual([
                {
                    selectedSetPlayId: before[0].selectedSetPlayId,
                    setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                    name: 'Gwarancja startów',
                    type: SetPlayEnumType.GwarancjaStartow,
                    userData: { playerId: ownPlayerIds[2] }
                },
                ...before.slice(1)
            ]);
            expect(await getStoredSetPlays(startingLineupId)).toEqual(updated);
        }
    );

    test.each([
        SetPlayEnumType.Ncd,
        SetPlayEnumType.Ncd6,
        SetPlayEnumType.Awatar
    ])(
        'Should update %s rider selections while preserving the selected ID and admin data',
        async type => {
            const playerId =
                type === SetPlayEnumType.Awatar
                    ? marketPlayerId
                    : ownPlayerIds[0];
            const userData = {
                playerId,
                ...(type === SetPlayEnumType.Awatar
                    ? { replacedPlayerId: ownPlayerIds[1] }
                    : {})
            };
            const saved = await SetPlaysDataModel.saveSetPlay(
                startingLineupId,
                {
                    setPlayId: getSetPlayId(type),
                    userData: {
                        playerId: playerId.toUpperCase(),
                        ...(type === SetPlayEnumType.Awatar
                            ? { replacedPlayerId: ownPlayerIds[1].toUpperCase() }
                            : {})
                    }
                },
                type
            );
            expect(saved[0]).toMatchObject({ userData });

            const adminData =
                type === SetPlayEnumType.Awatar
                    ? { heatOne: { value: 3, bonus: true, isNominated: true } }
                    : { playerIdList: opponentPlayerIds.slice(0, 4) };
            await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                { ...saved[0], adminData }
            ]);
            const before = await getStoredSetPlays(startingLineupId);
            expect(before[0]).toMatchObject({ userData, adminData });
            const updatedUserData = {
                playerId: ownPlayerIds[2],
                ...(type === SetPlayEnumType.Awatar
                    ? { replacedPlayerId: ownPlayerIds[3] }
                    : {})
            };
            const updated = await SetPlaysDataModel.updateSetPlay(
                startingLineupId,
                saved[0].selectedSetPlayId,
                {
                    setPlayId: getSetPlayId(type),
                    userData: {
                        playerId: ownPlayerIds[2].toUpperCase(),
                        ...(type === SetPlayEnumType.Awatar
                            ? { replacedPlayerId: ownPlayerIds[3].toUpperCase() }
                            : {})
                    }
                }
            );

            expect(updated).toEqual([
                { ...before[0], userData: updatedUserData }
            ]);
            expect(await getStoredSetPlays(startingLineupId)).toEqual(updated);
            expect(
                await SetPlaysDataModel.getSetPlaysForUser(startingLineupId)
            ).toEqual([
                {
                    selectedSetPlayId: saved[0].selectedSetPlayId,
                    setPlayId: getSetPlayId(type),
                    name: catalogNames[type],
                    type,
                    userData: updatedUserData
                }
            ]);
        }
    );

    test('Should update selected set play data when six set plays are already selected', async () => {
        await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Ncd),
                    userData: { playerId: ownPlayerIds[0] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Ncd),
                    userData: { playerId: ownPlayerIds[0] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Ncd6),
                    userData: { playerId: ownPlayerIds[1] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Ncd6),
                    userData: { playerId: ownPlayerIds[1] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Rezerwa),
                    userData: { playerId: ownPlayerIds[5] },
                    adminData: {
                        heatOne: { value: 3, bonus: true, isNominated: true },
                        heatTwo: { value: 0 },
                        heatSeven: { value: null }
                    }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.RezerwaGielda),
                    userData: { playerId: marketPlayerId }
                }
            ]
        });
        const before = await getStoredSetPlays(startingLineupId);

        const updated = await SetPlaysDataModel.updateSetPlay(
            startingLineupId,
            before[4].selectedSetPlayId,
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Rezerwa),
                userData: { playerId: ownPlayerIds[4] }
            }
        );

        expect(updated).toEqual([
            ...before.slice(0, 4),
            {
                ...before[4],
                userData: { playerId: ownPlayerIds[4] }
            },
            before[5]
        ]);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(updated);
    });
});

describe('removeSetPlay', () => {
    test('Should throw when no set plays document exists for the starting lineup', async () => {
        await expect(
            SetPlaysDataModel.removeSetPlay(
                startingLineupId,
                new mongoose.Types.ObjectId().toString()
            )
        ).rejects.toThrow('No set plays for starting lineup');
        expect(await getStoredSetPlays(startingLineupId)).toEqual([]);
        expect(await SetPlaysDataModel.exists({ startingLineupId })).toBeNull();
    });

    test('Should throw when the selected set play list is empty', async () => {
        await SetPlaysDataModel.create({ startingLineupId, setPlayList: [] });

        await expect(
            SetPlaysDataModel.removeSetPlay(
                startingLineupId,
                new mongoose.Types.ObjectId().toString()
            )
        ).rejects.toThrow('Selected set play not found');
        expect(await getStoredSetPlays(startingLineupId)).toEqual([]);
    });

    test('Should propagate validation errors without changing saved selected set plays', async () => {
        const document = await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                { setPlayId: getSetPlayId(SetPlayEnumType.Remis) },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                    userData: { playerId: ownPlayerIds[0] }
                }
            ]
        });
        const before = await SetPlaysDataModel.findOne({ startingLineupId })
            .lean()
            .exec();
        await SetPlaysModel.deleteOne({
            _id: getSetPlayId(SetPlayEnumType.GwarancjaStartow)
        });

        await expect(
            SetPlaysDataModel.removeSetPlay(
                startingLineupId,
                document.setPlayList[0]._id.toString()
            )
        ).rejects.toThrow('Set play with provided setPlayId does not exists');
        const after = await SetPlaysDataModel.findOne({ startingLineupId })
            .lean()
            .exec();
        expect(after?.setPlayList).toEqual(before?.setPlayList);
    });

    test('Should remove the last selected set play and return an empty list', async () => {
        const document = await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [{ setPlayId: getSetPlayId(SetPlayEnumType.Remis) }]
        });

        const remaining = await SetPlaysDataModel.removeSetPlay(
            startingLineupId,
            document.setPlayList[0]._id.toString()
        );

        expect(remaining).toEqual([]);
        expect(await getStoredSetPlays(startingLineupId)).toEqual([]);
        expect(await SetPlaysDataModel.exists({ startingLineupId })).toEqual({
            _id: document._id
        });
    });

    test('Should remove only the selected set play when two selections have the same type', async () => {
        const document = await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                    userData: { playerId: ownPlayerIds[0] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                    userData: { playerId: ownPlayerIds[1] }
                }
            ]
        });

        const remaining = await SetPlaysDataModel.removeSetPlay(
            startingLineupId,
            document.setPlayList[0]._id.toString()
        );

        expect(remaining).toEqual([
            {
                selectedSetPlayId: document.setPlayList[1]._id.toString(),
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                name: 'Gwarancja startów',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: ownPlayerIds[1] }
            }
        ]);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(remaining);
    });

    test.each([0, 1, 2])(
        'Should remove the selected set play and return the complete mapped list with other types (removed index %i)',
        async selectedIndex => {
            await SetPlaysDataModel.create({
                startingLineupId,
                setPlayList: [
                    {
                        setPlayId: getSetPlayId(
                            SetPlayEnumType.GwarancjaStartow
                        ),
                        userData: { playerId: ownPlayerIds[0] }
                    },
                    {
                        setPlayId: getSetPlayId(
                            SetPlayEnumType.GwarancjaStartow
                        ),
                        userData: { playerId: ownPlayerIds[1] }
                    },
                    { setPlayId: getSetPlayId(SetPlayEnumType.Remis) }
                ]
            });
            const before = await getStoredSetPlays(startingLineupId);

            const remaining = await SetPlaysDataModel.removeSetPlay(
                startingLineupId,
                before[selectedIndex].selectedSetPlayId
            );

            const expected = [
                ...before.slice(0, selectedIndex),
                ...before.slice(selectedIndex + 1)
            ];
            expect(remaining).toEqual(expected);
            expect(await getStoredSetPlays(startingLineupId)).toEqual(expected);
        }
    );

    test('Should remove the selected set play when six set plays are already selected', async () => {
        await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Ncd),
                    userData: { playerId: ownPlayerIds[0] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Ncd),
                    userData: { playerId: ownPlayerIds[0] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Ncd6),
                    userData: { playerId: ownPlayerIds[1] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Ncd6),
                    userData: { playerId: ownPlayerIds[1] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Rezerwa),
                    userData: { playerId: ownPlayerIds[5] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.RezerwaGielda),
                    userData: { playerId: marketPlayerId }
                }
            ]
        });
        const before = await getStoredSetPlays(startingLineupId);

        const remaining = await SetPlaysDataModel.removeSetPlay(
            startingLineupId,
            before[4].selectedSetPlayId
        );

        const expected = [...before.slice(0, 4), before[5]];
        expect(remaining).toEqual(expected);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(expected);
    });
});

describe('saveSelectedSetPlay', () => {
    test('Should save the first selected set play and return the mapped setPlayList', async () => {
        const document = new SetPlaysDataModel({ startingLineupId });
        document.set('setPlayList', [
            ...document.setPlayList,
            {
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                userData: { playerId: ownPlayerIds[0] }
            }
        ]);
        const selectedSetPlayId = document.setPlayList[0]._id.toString();

        const saved = await document.saveSelectedSetPlay();

        expect(saved).toEqual([
            {
                selectedSetPlayId,
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                name: 'Gwarancja startów',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: ownPlayerIds[0] }
            }
        ]);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(saved);
    });

    test('Should save an appended set play and return three different types without overwriting existing selections', async () => {
        const document = await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                    userData: { playerId: ownPlayerIds[0] }
                },
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.RyszardKowalski),
                    userData: { playerId: ownPlayerIds[1] }
                }
            ]
        });
        const existingSelectionCount = document.setPlayList.length;
        const existingSelectedSetPlayIds = document.setPlayList.map(play => {
            return play._id.toString();
        });
        document.set('setPlayList', [
            ...document.setPlayList,
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Spartacus),
                userData: {
                    ownPlayerId: ownPlayerIds[2],
                    opponentPlayerId: opponentPlayerIds[0]
                }
            }
        ]);
        const selectedSetPlayId = document.setPlayList[2]._id.toString();

        const saved = await document.saveSelectedSetPlay();

        expect(saved).toHaveLength(existingSelectionCount + 1);
        expect(saved).toEqual([
            {
                selectedSetPlayId: existingSelectedSetPlayIds[0],
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                name: 'Gwarancja startów',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: ownPlayerIds[0] }
            },
            {
                selectedSetPlayId: existingSelectedSetPlayIds[1],
                setPlayId: getSetPlayId(SetPlayEnumType.RyszardKowalski),
                name: 'Ryszard Kowalski',
                type: SetPlayEnumType.RyszardKowalski,
                userData: { playerId: ownPlayerIds[1] }
            },
            {
                selectedSetPlayId,
                setPlayId: getSetPlayId(SetPlayEnumType.Spartacus),
                name: 'Spartacus',
                type: SetPlayEnumType.Spartacus,
                userData: {
                    ownPlayerId: ownPlayerIds[2],
                    opponentPlayerId: opponentPlayerIds[0]
                }
            }
        ]);
        expect(new Set(saved.map(play => play.selectedSetPlayId)).size).toBe(3);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(saved);
    });

    test('Should save an appended set play of the same type without overwriting the existing selection', async () => {
        const document = await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                    userData: { playerId: ownPlayerIds[0] }
                }
            ]
        });
        const existingSelectionCount = document.setPlayList.length;
        const existingSelectedSetPlayId =
            document.setPlayList[0]._id.toString();
        document.set('setPlayList', [
            ...document.setPlayList,
            {
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                userData: { playerId: ownPlayerIds[1] }
            }
        ]);
        const selectedSetPlayId = document.setPlayList[1]._id.toString();

        const saved = await document.saveSelectedSetPlay();

        expect(saved).toHaveLength(existingSelectionCount + 1);
        expect(saved).toEqual([
            {
                selectedSetPlayId: existingSelectedSetPlayId,
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                name: 'Gwarancja startów',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: ownPlayerIds[0] }
            },
            {
                selectedSetPlayId,
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                name: 'Gwarancja startów',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: ownPlayerIds[1] }
            }
        ]);
        expect(selectedSetPlayId).not.toBe(existingSelectedSetPlayId);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(saved);
    });
});

describe('getSetPlayListByStartingLineupId', () => {
    test('Should throw when a selected set-play reference cannot be populated', async () => {
        await createDanglingSetPlay();
        await expect(
            SetPlaysDataModel.getSetPlayListByStartingLineupId(startingLineupId)
        ).rejects.toThrow(TypeError);
    });

    test('Should return an empty list when no set-plays-data document exists', async () => {
        expect(
            await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            )
        ).toEqual({ setPlayList: [] });
    });

    test('Should return an empty list when the selected set play list is empty', async () => {
        await SetPlaysDataModel.create({ startingLineupId: startingLineupId });
        expect(
            await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            )
        ).toEqual({ setPlayList: [] });
    });

    test('Should return selected set plays for given startingLineupId', async () => {
        const saved = await addSelectedSetPlays(startingLineupId, [
            { setPlayId: getSetPlayId(SetPlayEnumType.Remis) },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Rezerwa),
                userData: { playerId: ownPlayerIds[5] }
            }
        ]);
        await SetPlaysDataModel.updateOne(
            {
                startingLineupId: startingLineupId,
                'setPlayList._id': saved[0].selectedSetPlayId
            },
            {
                $set: {
                    'setPlayList.$.adminData': {
                        ...remisAdminData([ownPlayerIds[0], ownPlayerIds[1]])
                    }
                }
            }
        );
        await SetPlaysDataModel.saveSetPlay(
            opponentStartingLineupId,
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Muchomor)
            },
            SetPlayEnumType.Muchomor
        );
        await SetPlaysModel.updateOne(
            { _id: getSetPlayId(SetPlayEnumType.Remis) },
            { name: 'Remis – zmieniona nazwa' }
        ).exec();

        const result =
            await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                startingLineupId
            );

        expect(result).toEqual({
            setPlayList: [
                {
                    ...saved[0],
                    name: 'Remis – zmieniona nazwa',
                    adminData: remisAdminData([
                        ownPlayerIds[0],
                        ownPlayerIds[1]
                    ])
                },
                saved[1]
            ]
        });
        expect(result.setPlayList[0]).not.toBeInstanceOf(mongoose.Document);
    });
});

describe('getSetPlaysForUser', () => {
    test('Should throw when a selected set-play definition is missing', async () => {
        await createDanglingSetPlay();
        await expect(
            SetPlaysDataModel.getSetPlaysForUser(startingLineupId)
        ).rejects.toThrow('Missing catalog entry for selected set play');
    });

    test('Should return an empty list when no set-plays-data document exists', async () => {
        expect(
            await SetPlaysDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([]);
    });

    test('Should return an empty list when the selected set play list is empty', async () => {
        await SetPlaysDataModel.create({ startingLineupId: startingLineupId });
        expect(
            await SetPlaysDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([]);
    });

    test('Should return selected set play IDs, types, names and user inputs for the requested startingLineupId', async () => {
        const saved = await addSelectedSetPlays(startingLineupId, [
            { setPlayId: getSetPlayId(SetPlayEnumType.Remis) },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                userData: { playerId: ownPlayerIds[0] }
            },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                userData: { playerId: ownPlayerIds[1] }
            },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.BrudnaPala),
                userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
            }
        ]);
        await SetPlaysDataModel.updateOne(
            {
                startingLineupId: startingLineupId,
                'setPlayList._id': saved[0].selectedSetPlayId
            },
            {
                $set: {
                    'setPlayList.$.adminData': remisAdminData([
                        ownPlayerIds[0],
                        ownPlayerIds[1]
                    ])
                }
            }
        );
        const result =
            await SetPlaysDataModel.getSetPlaysForUser(startingLineupId);
        expect(result).toEqual([
            {
                selectedSetPlayId: saved[0].selectedSetPlayId,
                setPlayId: getSetPlayId(SetPlayEnumType.Remis),
                type: SetPlayEnumType.Remis,
                name: 'Remis',
                userData: null
            },
            {
                selectedSetPlayId: saved[1].selectedSetPlayId,
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                type: SetPlayEnumType.GwarancjaStartow,
                name: 'Gwarancja startów',
                userData: { playerId: ownPlayerIds[0] }
            },
            {
                selectedSetPlayId: saved[2].selectedSetPlayId,
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                type: SetPlayEnumType.GwarancjaStartow,
                name: 'Gwarancja startów',
                userData: { playerId: ownPlayerIds[1] }
            },
            {
                selectedSetPlayId: saved[3].selectedSetPlayId,
                setPlayId: getSetPlayId(SetPlayEnumType.BrudnaPala),
                type: SetPlayEnumType.BrudnaPala,
                name: 'Brudna pała',
                userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
            }
        ]);
        expect(result[1].selectedSetPlayId).not.toBe(result[2].selectedSetPlayId);
    });
});

describe('saveAdminSetPlay', () => {
    const heatTypes = [
        SetPlayEnumType.Rezerwa,
        SetPlayEnumType.RezerwaGielda,
        SetPlayEnumType.Awatar
    ];

    const fullScores = {
        heatOne: { value: 1, bonus: false, isNominated: false },
        heatTwo: { value: 2, bonus: false, isNominated: false },
        heatThree: { value: 3, bonus: false, isNominated: false },
        heatFour: { value: 4, bonus: false, isNominated: false },
        heatFive: { value: 5, bonus: false, isNominated: false },
        heatSix: { value: 6, bonus: false, isNominated: false },
        heatSeven: { value: 7, bonus: false, isNominated: false }
    };

    function adminSetPlayData(type: SetPlayEnumType): SetPlayDataType {
        const setPlayId = getSetPlayId(type);
        if (type === SetPlayEnumType.Remis) {
            return {
                setPlayId,
                adminData: remisAdminData([ownPlayerIds[0]])
            };
        }
        if (heatTypes.includes(type)) {
            return {
                setPlayId,
                userData: {
                    playerId: ownPlayerIds[0],
                    ...(type === SetPlayEnumType.Awatar
                        ? { replacedPlayerId: ownPlayerIds[1] }
                        : {})
                },
                adminData: {
                    ...fullScores,
                    ...(type === SetPlayEnumType.Awatar ? { isDisabled: false } : {})
                }
            };
        }
        if (type === SetPlayEnumType.Spartacus) {
            return {
                setPlayId,
                userData: {
                    ownPlayerId: ownPlayerIds[0],
                    opponentPlayerId: opponentPlayerIds[0]
                },
                adminData: {
                    ownAverage: 1,
                    opponentAverage: 2
                }
            };
        }
        if (type === SetPlayEnumType.BrudnaPala) {
            return {
                setPlayId,
                userData: { leaderIdList: ownPlayerIds.slice(0, 4) },
                adminData: brudnaPalaAdminData(ownPlayerIds.slice(0, 4))
            };
        }
        return {
            setPlayId,
            userData: { playerId: ownPlayerIds[0] },
            adminData: { playerIdList: ownPlayerIds.slice(0, 4) }
        };
    }

    test.each(['0', '15', '1.5'])(
        'Should throw for invalid round %s',
        async roundNumber => {
            await expect(
                SetPlaysDataModel.saveAdminSetPlay(roundNumber, ownUserId, [])
            ).rejects.toThrow(
                `Invalid roundNumber: ${roundNumber}. Must be between 1 and 14`
            );
        }
    );

    test('Should throw for a nonexistent user', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        await expect(
            SetPlaysDataModel.saveAdminSetPlay('2', userId, [])
        ).rejects.toThrow(`Invalid userId: ${userId}`);
    });

    test('Should throw when no starting lineup exists for the user and round', async () => {
        await expect(
            SetPlaysDataModel.saveAdminSetPlay('1', ownUserId, [
                { setPlayId: getSetPlayId(SetPlayEnumType.Remis) }
            ])
        ).rejects.toThrow('No starting lineup for user and round');
    });

    test('Should throw when no set plays document exists for the starting lineup', async () => {
        await expect(
            SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                { setPlayId: getSetPlayId(SetPlayEnumType.Remis) }
            ])
        ).rejects.toThrow('No set plays for starting lineup');
        expect(await getStoredSetPlays(startingLineupId)).toEqual([]);
    });

    test(
        'Should throw for missing selectedSetPlayId without changing saved selections',
        async () => {
            await SetPlaysDataModel.create({
                startingLineupId,
                setPlayList: [adminSetPlayData(SetPlayEnumType.Remis)]
            });
            const before = await getStoredSetPlays(startingLineupId);
            await expect(
                SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                    {
                        ...before[0],
                        adminData: remisAdminData()
                    },
                    {
                        setPlayId: before[0].setPlayId,
                        adminData: remisAdminData()
                    }
                ])
            ).rejects.toThrow('Selected set play not found');
            expect(await getStoredSetPlays(startingLineupId)).toEqual(before);
        }
    );

    const invalidAdminCases: {
        type: SetPlayEnumType;
        label: string;
        adminData: () => unknown;
        path: (string | number)[];
        code: string;
        message?: string;
    }[] = [];

    for (const type of [SetPlayEnumType.Ncd, SetPlayEnumType.Ncd6]) {
        const listCases = [
            {
                label: 'duplicate player IDs',
                list: () => [
                    ownPlayerIds[0],
                    ownPlayerIds[0],
                    ...ownPlayerIds.slice(2, 4)
                ],
                path: [],
                code: 'custom',
                message: 'Player IDs must be present and distinct'
            },
        ];
        listCases.push(
            {
                label: 'fewer than four players',
                list: () => ownPlayerIds.slice(0, 3),
                path: [],
                code: 'custom',
                message: 'Four players are required'
            },
            {
                label: 'more than four players',
                list: () => ownPlayerIds.slice(0, 5),
                path: [],
                code: 'custom',
                message: 'Four players are required'
            }
        );
        for (const item of listCases) {
            invalidAdminCases.push({
                type,
                label: item.label,
                adminData: () => ({ playerIdList: item.list() }),
                path: ['playerIdList', ...item.path],
                code: item.code,
                ...('message' in item ? { message: item.message } : {})
            });
        }
    }

    for (const field of ['ownAverage', 'opponentAverage']) {
        invalidAdminCases.push({
            type: SetPlayEnumType.Spartacus,
            label: `${field} missing`,
            adminData: () => {
                return {
                    ownAverage: 1,
                    opponentAverage: 2,
                    [field]: undefined
                };
            },
            path: [field],
            code: 'invalid_type'
        });
    }

    test.each(invalidAdminCases)(
        'Should reject $type $label without saving any update in the batch',
        async ({ type, adminData, path, code, message }) => {
            const issuePath = path;
            await SetPlaysDataModel.create({
                startingLineupId,
                setPlayList: [
                    {
                        setPlayId: getSetPlayId(SetPlayEnumType.Remis),
                        adminData: remisAdminData()
                    },
                    adminSetPlayData(type)
                ]
            });
            const before = await getStoredSetPlays(startingLineupId);
            const save = SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                {
                    ...before[0],
                    adminData: remisAdminData([ownPlayerIds[0]])
                },
                {
                    ...before[1],
                    adminData: adminData() as SetPlayDataType['adminData']
                }
            ]);
            await expect(save).rejects.toBeInstanceOf(ZodError);
            await expect(save).rejects.toMatchObject({
                issues: expect.arrayContaining([
                    expect.objectContaining({
                        path: [1, 'adminData', ...issuePath],
                        code,
                        ...(message ? { message } : {})
                    })
                ])
            });
            expect(await getStoredSetPlays(startingLineupId)).toEqual(before);
        }
    );

    test.each([SetPlayEnumType.Ncd, SetPlayEnumType.Ncd6])(
        'Should save four distinct valid player IDs for %s',
        async type => {
            await SetPlaysDataModel.create({
                startingLineupId,
                setPlayList: [adminSetPlayData(type)]
            });
            const before = await getStoredSetPlays(startingLineupId);
            const adminData = { playerIdList: opponentPlayerIds.slice(0, 4) };
            expect(
                await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                    {
                        ...before[0],
                        adminData
                    }
                ])
            ).toBeUndefined();
            expect(await getStoredSetPlays(startingLineupId)).toEqual([
                {
                    ...before[0],
                    adminData
                }
            ]);
        }
    );

    test('Should save Remis checkbox results with checked and unchecked players', async () => {
        await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Remis),
                    adminData: remisAdminData([ownPlayerIds[0]])
                }
            ]
        });
        const before = await getStoredSetPlays(startingLineupId);
        const adminData = remisAdminData([
            ownPlayerIds[0],
            ownPlayerIds[2]
        ]);
        await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
            {
                ...before[0],
                adminData
            }
        ]);
        expect(await getStoredSetPlays(startingLineupId)).toEqual([
            {
                ...before[0],
                adminData
            }
        ]);
    });

    test('Should save a Remis checkbox changed from checked to unchecked', async () => {
        await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                {
                    setPlayId: getSetPlayId(SetPlayEnumType.Remis),
                    adminData: remisAdminData([ownPlayerIds[1]])
                }
            ]
        });
        const before = await getStoredSetPlays(startingLineupId);
        const adminData = remisAdminData([ownPlayerIds[1]]);
        await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
            { ...before[0], adminData }
        ]);

        const saved = await getStoredSetPlays(startingLineupId);
        const uncheckedAdminData = remisAdminData();
        await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
            { ...saved[0], adminData: uncheckedAdminData }
        ]);

        expect(await getStoredSetPlays(startingLineupId)).toEqual([
            { ...saved[0], adminData: uncheckedAdminData }
        ]);
    });

    test.each(
        heatTypes.flatMap(type => {
            return [0, 100].map(score => {
                return {
                    type,
                    score
                };
            });
        })
    )(
        'Should save $score for every heat field of $type',
        async ({ type, score }) => {
            await SetPlaysDataModel.create({
                startingLineupId,
                setPlayList: [adminSetPlayData(type)]
            });
            const before = await getStoredSetPlays(startingLineupId);
            const adminData = {
                ...(type === SetPlayEnumType.Awatar ? { isDisabled: false } : {}),
                heatOne: { value: score, bonus: false, isNominated: false },
                heatTwo: { value: score, bonus: false, isNominated: false },
                heatThree: { value: score, bonus: false, isNominated: false },
                heatFour: { value: score, bonus: false, isNominated: false },
                heatFive: { value: score, bonus: false, isNominated: false },
                heatSix: { value: score, bonus: false, isNominated: false },
                heatSeven: { value: score, bonus: false, isNominated: false }
            };
            await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                {
                    ...before[0],
                    adminData
                }
            ]);
            expect(await getStoredSetPlays(startingLineupId)).toEqual([
                {
                    ...before[0],
                    adminData
                }
            ]);
        }
    );

    test.each(heatTypes)(
        'Should preserve %s heat values and flags through saving, editing and resubmitting',
        async type => {
            const before = await SetPlaysDataModel.saveSetPlay(
                startingLineupId,
                {
                    setPlayId: getSetPlayId(type),
                    userData: {
                        playerId: ownPlayerIds[0],
                        ...(type === SetPlayEnumType.Awatar
                            ? { replacedPlayerId: ownPlayerIds[1] }
                            : {})
                    }
                },
                type
            );
            const unusedHeat = {
                value: null,
                bonus: false,
                isNominated: false
            };
            const unusedScores = {
                ...(type === SetPlayEnumType.Awatar ? { isDisabled: false } : {}),
                heatOne: unusedHeat,
                heatTwo: unusedHeat,
                heatThree: unusedHeat,
                heatFour: unusedHeat,
                heatFive: unusedHeat,
                heatSix: unusedHeat,
                heatSeven: unusedHeat
            };
            expect(before[0]).toHaveProperty('adminData', unusedScores);

            const submittedScores = {
                heatOne: { value: 3, bonus: true, isNominated: true },
                heatTwo: { value: 0 },
                heatThree: { value: 1.5 }
            };
            await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                { ...before[0], adminData: submittedScores }
            ]);
            const expectedScores = {
                ...unusedScores,
                heatOne: { value: 3, bonus: true, isNominated: true },
                heatTwo: { value: 0, bonus: false, isNominated: false },
                heatThree: { value: 1.5, bonus: false, isNominated: false }
            };
            expect(await getStoredSetPlays(startingLineupId)).toEqual([
                { ...before[0], adminData: expectedScores }
            ]);
            expect(
                await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)
            ).toEqual([
                {
                    selectedSetPlayId: before[0].selectedSetPlayId,
                    setPlayId: before[0].setPlayId,
                    name: catalogNames[type],
                    type,
                    adminData: expectedScores
                }
            ]);

            const editedScores = {
                ...fullScores,
                ...(type === SetPlayEnumType.Awatar ? { isDisabled: false } : {}),
                heatOne: unusedHeat
            };
            // Another set-play form may trigger resubmission of this unchanged payload.
            for (const adminData of [editedScores, editedScores]) {
                await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                    { ...before[0], adminData }
                ]);
                expect(await getStoredSetPlays(startingLineupId)).toEqual([
                    { ...before[0], adminData: editedScores }
                ]);
                expect(
                    (await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId))[0]
                ).toHaveProperty('adminData', editedScores);
            }
        }
    );

    test('Should save nonnegative Spartacus averages including zero and fractional values', async () => {
        await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [adminSetPlayData(SetPlayEnumType.Spartacus)]
        });
        const before = await getStoredSetPlays(startingLineupId);
        for (const adminData of [
            {
                ownAverage: 0,
                opponentAverage: 2.25
            },
            {
                ownAverage: 2.25,
                opponentAverage: 0
            }
        ]) {
            await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                {
                    ...before[0],
                    adminData
                }
            ]);
            expect(await getStoredSetPlays(startingLineupId)).toEqual([
                {
                    ...before[0],
                    adminData
                }
            ]);
        }
    });

    test('Should prefill four BrudnaPala player results with false and save checked and unchecked values', async () => {
        const setPlayData = {
            setPlayId: getSetPlayId(SetPlayEnumType.BrudnaPala),
            userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
        };
        const before = await SetPlaysDataModel.saveSetPlay(
            startingLineupId,
            setPlayData,
            SetPlayEnumType.BrudnaPala
        );
        expect(before).toEqual([
            {
                ...setPlayData,
                selectedSetPlayId: expect.any(String),
                name: 'Brudna pała',
                type: SetPlayEnumType.BrudnaPala,
                adminData: brudnaPalaAdminData()
            }
        ]);
        const adminData = brudnaPalaAdminData([ownPlayerIds[0]]);
        await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
            {
                ...before[0],
                adminData
            }
        ]);
        expect(await getStoredSetPlays(startingLineupId)).toEqual([
            {
                ...before[0],
                adminData
            }
        ]);
        await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
            { ...before[0], adminData: brudnaPalaAdminData() }
        ]);
        expect(await getStoredSetPlays(startingLineupId)).toEqual(before);
    });

    test.each([SetPlayEnumType.Awatar, SetPlayEnumType.BrudnaPala])(
        'Should disable and re-enable %s while preserving its inputs and other selected plays',
        async type => {
            await SetPlaysDataModel.create({
                startingLineupId,
                setPlayList: [
                    adminSetPlayData(type),
                    adminSetPlayData(SetPlayEnumType.Remis)
                ]
            });
            const before = await getStoredSetPlays(startingLineupId);
            expect(before[0]).toHaveProperty('adminData.isDisabled', false);
            const savedAdminData =
                'adminData' in before[0] ? before[0].adminData : undefined;

            for (const isDisabled of [true, false]) {
                await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                    { ...before[0], adminData: { ...savedAdminData, isDisabled } }
                ]);
                const expectedAdminData = { ...savedAdminData, isDisabled };
                expect(await getStoredSetPlays(startingLineupId)).toEqual([
                    { ...before[0], adminData: expectedAdminData },
                    before[1]
                ]);
                expect(
                    (await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId))[0]
                ).toHaveProperty('adminData', expectedAdminData);
            }

            await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                { ...before[0], adminData: { ...savedAdminData, isDisabled: true } }
            ]);
            const updated = await SetPlaysDataModel.updateSetPlay(
                startingLineupId,
                before[0].selectedSetPlayId,
                {
                    setPlayId: before[0].setPlayId,
                    userData: type === SetPlayEnumType.Awatar
                        ? { playerId: marketPlayerId, replacedPlayerId: ownPlayerIds[2] }
                        : { leaderIdList: ownPlayerIds.slice(0, 4).reverse() }
                }
            );
            expect(updated[0]).toHaveProperty('adminData', {
                ...savedAdminData,
                isDisabled: true
            });
            expect(updated[1]).toEqual(before[1]);
        }
    );

    test.each([1, 14])(
        'Should save admin data at boundary round %i',
        async round => {
            const startingLineup = await createStartingLineup(
                ownUserId,
                ownPlayerIds,
                round
            );
            const id = startingLineup._id.toString();
            await SetPlaysDataModel.create({
                startingLineupId: id,
                setPlayList: [adminSetPlayData(SetPlayEnumType.Remis)]
            });
            const before = await getStoredSetPlays(id);
            const adminData = remisAdminData();
            await SetPlaysDataModel.saveAdminSetPlay(String(round), ownUserId, [
                {
                    ...before[0],
                    adminData
                }
            ]);
            expect(await getStoredSetPlays(id)).toEqual([
                {
                    ...before[0],
                    adminData
                }
            ]);
        }
    );

    test('Should save a bulk form with six selected set plays requiring admin data for the requested user and round', async () => {
        await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                adminSetPlayData(SetPlayEnumType.Remis),
                adminSetPlayData(SetPlayEnumType.Rezerwa),
                adminSetPlayData(SetPlayEnumType.RezerwaGielda),
                adminSetPlayData(SetPlayEnumType.Spartacus),
                adminSetPlayData(SetPlayEnumType.BrudnaPala),
                adminSetPlayData(SetPlayEnumType.Awatar)
            ]
        });
        const nextLineup = await createStartingLineup(
            ownUserId,
            ownPlayerIds,
            3
        );
        await SetPlaysDataModel.create({
            startingLineupId: nextLineup._id,
            setPlayList: [adminSetPlayData(SetPlayEnumType.Remis)]
        });
        await SetPlaysDataModel.create({
            startingLineupId: opponentStartingLineupId,
            setPlayList: [adminSetPlayData(SetPlayEnumType.Remis)]
        });
        const before = await getStoredSetPlays(startingLineupId);
        const nextRoundBefore = await SetPlaysDataModel.getSetPlaysForAdmin(
            3,
            ownUserId
        );
        const opponentBefore = await SetPlaysDataModel.getSetPlaysForAdmin(
            2,
            opponentUserId
        );
        const updatedSetPlays = [
            {
                ...before[0],
                adminData: remisAdminData([
                    ownPlayerIds[0],
                    ownPlayerIds[2]
                ])
            },
            {
                ...before[1],
                adminData: {
                    ...fullScores,
                    heatOne: { value: 11, bonus: true, isNominated: false }
                }
            },
            {
                ...before[2],
                adminData: {
                    ...fullScores,
                    heatTwo: { value: 22, bonus: false, isNominated: true }
                }
            },
            {
                ...before[3],
                adminData: { ownAverage: 3.5, opponentAverage: 0 }
            },
            {
                ...before[4],
                adminData: brudnaPalaAdminData([ownPlayerIds[0]])
            },
            {
                ...before[5],
                adminData: {
                    ...fullScores,
                    isDisabled: false,
                    heatSeven: { value: 77, bonus: true, isNominated: true }
                }
            }
        ];
        expect(
            await SetPlaysDataModel.saveAdminSetPlay('2', ownUserId, [
                updatedSetPlays[3],
                updatedSetPlays[5],
                updatedSetPlays[1],
                updatedSetPlays[4],
                updatedSetPlays[0],
                updatedSetPlays[2]
            ])
        ).toBeUndefined();
        expect(await getStoredSetPlays(startingLineupId)).toEqual(updatedSetPlays);

        const resubmittedSetPlays = updatedSetPlays.map((setPlay, index) => {
            if (index === 0) {
                return { ...setPlay, adminData: remisAdminData() };
            }
            return setPlay;
        });
        await SetPlaysDataModel.saveAdminSetPlay(
            '2',
            ownUserId,
            resubmittedSetPlays
        );
        expect(await getStoredSetPlays(startingLineupId)).toEqual(
            resubmittedSetPlays
        );
        expect(
            await SetPlaysDataModel.getSetPlaysForAdmin(3, ownUserId)
        ).toEqual(nextRoundBefore);
        expect(
            await SetPlaysDataModel.getSetPlaysForAdmin(2, opponentUserId)
        ).toEqual(opponentBefore);
    });
});

describe('getSetPlaysForAdmin', () => {
    test.each([0, 15])(
        'Should throw error for regular-season round %i outside 1 - 14',
        async roundNumber => {
            await expect(
                SetPlaysDataModel.getSetPlaysForAdmin(roundNumber, ownUserId)
            ).rejects.toThrow(
                `Invalid roundNumber: ${roundNumber}. Must be between 1 and 14`
            );
        }
    );

    test('Should throw error for a nonexistent user', async () => {
        const nonexistentUserId = new mongoose.Types.ObjectId().toString();
        await expect(
            SetPlaysDataModel.getSetPlaysForAdmin(2, nonexistentUserId)
        ).rejects.toThrow(`Invalid userId: ${nonexistentUserId}`);
    });

    test('Should throw when a selected set-play definition is missing', async () => {
        await createDanglingSetPlay();
        await expect(
            SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)
        ).rejects.toThrow('Missing catalog entry for selected set play');
    });

    test('Should return empty list when given starting lineup does not exist', async () => {
        expect(
            await SetPlaysDataModel.getSetPlaysForAdmin(1, ownUserId)
        ).toEqual([]);
    });

    test('Should return empty array when the strting lineup has no set-plays-data document', async () => {
        expect(
            await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)
        ).toEqual([]);
    });

    test('Should return empty array when the selected set play list is empty', async () => {
        await SetPlaysDataModel.create({ startingLineupId: startingLineupId });
        expect(
            await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)
        ).toEqual([]);
    });

    test.each([1, 14])(
        'Should return selected set plays for boundary round %i',
        async roundNumber => {
            const startingLineup = await createStartingLineup(
                ownUserId,
                ownPlayerIds,
                roundNumber
            );
            const document = await SetPlaysDataModel.create({
                startingLineupId: startingLineup._id,
                setPlayList: [
                    {
                        setPlayId: getSetPlayId(SetPlayEnumType.Remis),
                        adminData: remisAdminData([ownPlayerIds[0]])
                    }
                ]
            });

            expect(
                await SetPlaysDataModel.getSetPlaysForAdmin(
                    roundNumber,
                    ownUserId
                )
            ).toEqual([
                {
                    selectedSetPlayId: document.setPlayList[0]._id.toString(),
                    setPlayId: getSetPlayId(SetPlayEnumType.Remis),
                    type: SetPlayEnumType.Remis,
                    name: 'Remis',
                    adminData: remisAdminData([ownPlayerIds[0]])
                }
            ]);
        }
    );

    test('Should return selected item IDs and admin form data including Remis checkbox state for the requested user and round', async () => {
        const saved = await addSelectedSetPlays(startingLineupId, [
            { setPlayId: getSetPlayId(SetPlayEnumType.Remis) },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.BrudnaPala),
                userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
            },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                userData: { playerId: ownPlayerIds[0] }
            },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Ncd6),
                userData: { playerId: ownPlayerIds[1] }
            },
            { setPlayId: getSetPlayId(SetPlayEnumType.Remis) }
        ]);
        await SetPlaysDataModel.updateOne(
            {
                startingLineupId: startingLineupId,
                'setPlayList._id': saved[0].selectedSetPlayId
            },
            {
                $set: {
                    'setPlayList.$.adminData': remisAdminData([
                        ownPlayerIds[0],
                        ownPlayerIds[1]
                    ])
                }
            }
        );
        const nextLineup = await createStartingLineup(
            ownUserId,
            ownPlayerIds,
            3
        );
        const nextSaved = await SetPlaysDataModel.saveSetPlay(
            nextLineup._id.toString(),
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Muchomor)
            },
            SetPlayEnumType.Muchomor
        );

        expect(
            await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)
        ).toEqual([
            {
                selectedSetPlayId: saved[0].selectedSetPlayId,
                setPlayId: saved[0].setPlayId,
                type: SetPlayEnumType.Remis,
                name: 'Remis',
                    adminData: remisAdminData([
                        ownPlayerIds[0],
                        ownPlayerIds[1]
                    ])
            },
            {
                selectedSetPlayId: saved[1].selectedSetPlayId,
                setPlayId: saved[1].setPlayId,
                type: SetPlayEnumType.BrudnaPala,
                name: 'Brudna pała',
                adminData: brudnaPalaAdminData()
            },
            {
                selectedSetPlayId: saved[2].selectedSetPlayId,
                setPlayId: saved[2].setPlayId,
                type: SetPlayEnumType.GwarancjaStartow,
                name: 'Gwarancja startów',
                adminData: null
            },
            {
                selectedSetPlayId: saved[3].selectedSetPlayId,
                setPlayId: saved[3].setPlayId,
                type: SetPlayEnumType.Ncd6,
                name: 'NCD6',
                adminData: null
            },
            {
                selectedSetPlayId: saved[4].selectedSetPlayId,
                setPlayId: saved[4].setPlayId,
                type: SetPlayEnumType.Remis,
                name: 'Remis',
                adminData: remisAdminData()
            }
        ]);
        expect((await getStoredSetPlays(startingLineupId))[4]).not.toHaveProperty(
            'adminData'
        );
        expect(
            await SetPlaysDataModel.getSetPlaysForAdmin(3, ownUserId)
        ).toEqual([
            {
                selectedSetPlayId: nextSaved[0].selectedSetPlayId,
                setPlayId: nextSaved[0].setPlayId,
                type: SetPlayEnumType.Muchomor,
                name: 'Muchomor',
                adminData: null
            }
        ]);
        expect(saved[0].selectedSetPlayId).not.toBe(saved[4].selectedSetPlayId);
        expect(saved[0].setPlayId).toBe(saved[4].setPlayId);
    });
});
