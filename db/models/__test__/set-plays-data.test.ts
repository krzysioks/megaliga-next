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
        playerFive: players[4]
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
            { setPlayId: getSetPlayId(SetPlayEnumType.Ncd), userData: null },
            { setPlayId: getSetPlayId(SetPlayEnumType.Ncd), userData: null },
            { setPlayId: getSetPlayId(SetPlayEnumType.Ncd6), userData: null },
            { setPlayId: getSetPlayId(SetPlayEnumType.Ncd6), userData: null },
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

    test('Should update selected set play data when six set plays are already selected', async () => {
        await SetPlaysDataModel.create({
            startingLineupId,
            setPlayList: [
                { setPlayId: getSetPlayId(SetPlayEnumType.Ncd) },
                { setPlayId: getSetPlayId(SetPlayEnumType.Ncd) },
                { setPlayId: getSetPlayId(SetPlayEnumType.Ncd6) },
                { setPlayId: getSetPlayId(SetPlayEnumType.Ncd6) },
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
                        playerIdList: [ownPlayerIds[0]]
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
                    adminData: { playerIdList: [ownPlayerIds[0]] }
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

    test('Should return only user-facing names and inputs for the requested startingLineupId', async () => {
        const saved = await addSelectedSetPlays(startingLineupId, [
            { setPlayId: getSetPlayId(SetPlayEnumType.Remis) },
            {
                setPlayId: getSetPlayId(SetPlayEnumType.GwarancjaStartow),
                userData: { playerId: ownPlayerIds[0] }
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
                    'setPlayList.$.adminData': {
                        playerIdList: [ownPlayerIds[0]]
                    }
                }
            }
        );
        expect(
            await SetPlaysDataModel.getSetPlaysForUser(startingLineupId)
        ).toEqual([
            { name: 'Remis', userData: null },
            {
                name: 'Gwarancja startów',
                userData: { playerId: ownPlayerIds[0] }
            },
            {
                name: 'Brudna pała',
                userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
            }
        ]);
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
            await SetPlaysDataModel.create({
                startingLineupId: startingLineup._id,
                setPlayList: [
                    {
                        setPlayId: getSetPlayId(SetPlayEnumType.Remis),
                        adminData: { playerIdList: [ownPlayerIds[0]] }
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
                    name: 'Remis',
                    adminData: { playerIdList: [ownPlayerIds[0]] }
                }
            ]);
        }
    );

    test('Should return only admin-facing names and results for the requested user and round', async () => {
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
            { setPlayId: getSetPlayId(SetPlayEnumType.Ncd6) }
        ]);
        await SetPlaysDataModel.updateOne(
            {
                startingLineupId: startingLineupId,
                'setPlayList._id': saved[0].selectedSetPlayId
            },
            {
                $set: {
                    'setPlayList.$.adminData': {
                        playerIdList: [ownPlayerIds[0]]
                    }
                }
            }
        );
        await SetPlaysDataModel.updateOne(
            {
                startingLineupId: startingLineupId,
                'setPlayList._id': saved[1].selectedSetPlayId
            },
            {
                $set: {
                    'setPlayList.$.adminData': {
                        leaders: ownPlayerIds
                            .slice(0, 4)
                            .map(playerId => ({ playerId, scoredMore: false }))
                    }
                }
            }
        );
        const nextLineup = await createStartingLineup(
            ownUserId,
            ownPlayerIds,
            3
        );
        await SetPlaysDataModel.saveSetPlay(
            nextLineup._id.toString(),
            {
                setPlayId: getSetPlayId(SetPlayEnumType.Muchomor)
            },
            SetPlayEnumType.Muchomor
        );

        expect(
            await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)
        ).toEqual([
            { name: 'Remis', adminData: { playerIdList: [ownPlayerIds[0]] } },
            {
                name: 'Brudna pała',
                adminData: {
                    leaders: ownPlayerIds.slice(0, 4).map(playerId => {
                        return { playerId, scoredMore: false };
                    })
                }
            },
            { name: 'Gwarancja startów', adminData: null },
            { name: 'NCD6', adminData: null }
        ]);
        expect(
            await SetPlaysDataModel.getSetPlaysForAdmin(3, ownUserId)
        ).toEqual([{ name: 'Muchomor', adminData: null }]);
    });
});

// These fixtures and cases remain for review with the deferred edit, removal, results, and eligibility operations.
// import type { SetPlayAdminInputType } from '@/db/models/games/set-plays-data';
// import ScheduleModel from '@/db/models/games/schedule';
// import LigueGroupsModel from '@/db/models/ligue-groups';
// import PlayersModel from '@/db/models/players';
// let inactivePlayerId: string;
// let otherPoolPlayerId: string;
// beforeEach(async () => {
//     await clearFixtures();
//     const catalog = await SetPlaysModel.create(
//         Object.values(SetPlayEnumType).map(type => {
//             return { type, name: catalogNames[type] };
//         })
//     );
//     catalogIds = new Map(catalog.map(play => [play.type, play._id.toString()]));
//     const groups = await LigueGroupsModel.create([
//         { groupName: 'dolce' },
//         { groupName: 'gabbana' }
//     ]);
//     const users = await UserModel.create(
//         groups.map((group, index) => {
//             return {
//                 username: `set-play-user-${index}`,
//                 coachName: `Coach ${index}`,
//                 email: `set-play-${index}@example.com`,
//                 password: 'Password1!',
//                 teamName: `Team ${index}`,
//                 logoUrl: 'https://example.com/logo.png',
//                 groupName: group._id
//             };
//         })
//     );
//     ownUserId = users[0]._id.toString();
//     opponentUserId = users[1]._id.toString();
//     const players = await PlayersModel.create([
//         ...Array.from({ length: 6 }, (_, index) => {
//             return {
//                 extraligaPlayerName: `Own ${index}`,
//                 dolceUserId: ownUserId
//             };
//         }),
//         ...Array.from({ length: 6 }, (_, index) => {
//             return {
//                 extraligaPlayerName: `Opponent ${index}`,
//                 gabbanaUserId: opponentUserId
//             };
//         }),
//         { extraligaPlayerName: 'Market' },
//         { extraligaPlayerName: 'Inactive', playerStatus: 'inactive' },
//         { extraligaPlayerName: 'Other pool', gabbanaUserId: opponentUserId }
//     ]);
//     ownPlayerIds = players.slice(0, 6).map(player => player._id.toString());
//     opponentPlayerIds = players
//         .slice(6, 12)
//         .map(player => player._id.toString());
//     marketPlayerId = players[12]._id.toString();
//     inactivePlayerId = players[13]._id.toString();
//     otherPoolPlayerId = players[14]._id.toString();
//     const lineup = await createLineup(ownUserId, ownPlayerIds);
//     const opponentLineup = await createLineup(
//         opponentUserId,
//         opponentPlayerIds
//     );
//     lineupId = lineup._id.toString();
//     opponentLineupId = opponentLineup._id.toString();
//     await ScheduleModel.create({
//         userOneId: opponentUserId,
//         userTwoId: ownUserId,
//         roundNumber: 2
//     });
// });
//

// test('Should accepts null userData when saving and updating plays without user inputs', async () => {
//     const [saved] = await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.Remis),
//         userData: null
//     });
//     expect(saved).not.toHaveProperty('userData');
//
//     const updated = await SetPlaysDataModel.updateSetPlay(
//         lineupId,
//         saved.selectedSetPlayId,
//         { setPlayId: catalogId(SetPlayEnumType.Muchomor), userData: null }
//     );
//
//     expect(updated[0]).not.toHaveProperty('userData');
//     expect(await getStoredSetPlays(lineupId)).toEqual(updated);
// });

// test('Should rejects null userData when the selected play requires user inputs', async () => {
//     const [saved] = await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.Remis)
//     });
//     const setPlayData: SetPlayDataType = {
//         setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//         userData: null
//     };
//
//     await expect(
//         SetPlaysDataModel.saveSetPlays(lineupId, setPlayData)
//     ).rejects.toThrow();
//     await expect(
//         SetPlaysDataModel.updateSetPlay(
//             lineupId,
//             saved.selectedSetPlayId,
//             setPlayData
//         )
//     ).rejects.toThrow();
//     expect(await getStoredSetPlays(lineupId)).toEqual([saved]);
// });

// test('Should rejects ineligible and nonexistent additions without changing saved selections', async () => {
//     const saved = await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.Remis)
//     });
//     const invalid: SetPlayDataType[] = [
//         {
//             setPlayId: catalogId(SetPlayEnumType.GwarancjaStartow),
//             userData: { playerId: ownPlayerIds[5] }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.RyszardKowalski),
//             userData: { playerId: opponentPlayerIds[0] }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: opponentPlayerIds[0] }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
//             userData: { playerId: ownPlayerIds[0] }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Spartacus),
//             userData: {
//                 ownPlayerId: ownPlayerIds[0],
//                 opponentPlayerId: ownPlayerIds[0]
//             }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Typer),
//             userData: {
//                 playerId: ownPlayerIds[5],
//                 attemptOne: {
//                     heatOne: 1,
//                     heatTwo: 2,
//                     heatThree: 3,
//                     heatFour: 0
//                 },
//                 attemptTwo: {
//                     heatOne: 3,
//                     heatTwo: 1,
//                     heatThree: 0,
//                     heatFour: 2
//                 }
//             }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Awatar),
//             userData: { playerId: opponentPlayerIds[0] }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
//             userData: {
//                 leaderIdList: [...ownPlayerIds.slice(0, 3), inactivePlayerId]
//             }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Awatar),
//             userData: { playerId: new mongoose.Types.ObjectId().toString() }
//         }
//     ];
//     for (const play of invalid) {
//         await expect(
//             SetPlaysDataModel.saveSetPlays(lineupId, play)
//         ).rejects.toThrow();
//         expect(await getStoredSetPlays(lineupId)).toEqual(saved);
//     }
// });

// test('Should records reserve heat results with zero defaults and keeps other results pending', async () => {
//     const saved = await addSelectedSetPlays(lineupId, [
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: ownPlayerIds[5] }
//         },
//         { setPlayId: catalogId(SetPlayEnumType.Remis) }
//     ]);
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             heatOne: 3,
//             heatFour: 0
//         }
//     );
//     expect(await getStoredSetPlays(lineupId)).toEqual([
//         {
//             ...saved[0],
//             adminData: {
//                 heatOne: 3,
//                 heatTwo: 0,
//                 heatThree: 0,
//                 heatFour: 0,
//                 heatFive: 0,
//                 heatSix: 0,
//                 heatSeven: 0
//             }
//         },
//         saved[1]
//     ]);
// });

// test('Should edits and removes one play while preserving the order and results of other selections', async () => {
//     const saved = await addSelectedSetPlays(lineupId, [
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: ownPlayerIds[5] }
//         },
//         { setPlayId: catalogId(SetPlayEnumType.Remis) }
//     ]);
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             heatOne: 3
//         }
//     );
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[1].selectedSetPlayId,
//         {
//             playerIdList: []
//         }
//     );
//     const evaluated = await getStoredSetPlays(lineupId);
//     const unchanged = await SetPlaysDataModel.updateSetPlay(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: ownPlayerIds[5] }
//         }
//     );
//     expect(unchanged).toEqual(evaluated);
//     const edited = await SetPlaysDataModel.updateSetPlay(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: ownPlayerIds[0] }
//         }
//     );
//     expect(edited).toEqual([
//         { ...saved[0], userData: { playerId: ownPlayerIds[0] } },
//         evaluated[1]
//     ]);
//     await expect(
//         SetPlaysDataModel.saveSetPlayResults(
//             lineupId,
//             saved[0].selectedSetPlayId,
//             {}
//         )
//     ).rejects.toThrow();
//     expect(
//         await SetPlaysDataModel.removeSetPlay(
//             lineupId,
//             saved[0].selectedSetPlayId
//         )
//     ).toEqual([evaluated[1]]);
//     expect(
//         await SetPlaysDataModel.removeSetPlay(
//             lineupId,
//             saved[1].selectedSetPlayId
//         )
//     ).toEqual([]);
//     expect(await getStoredSetPlays(lineupId)).toEqual([]);
//     await expect(
//         SetPlaysDataModel.removeSetPlay(lineupId, saved[1].selectedSetPlayId)
//     ).rejects.toThrow();
// });

// test('Should uses independent draft pools, accepting missing and null assignments', async () => {
//     // A Gabbana draft does not exclude the player from the Dolce market pool.
//     const initial = await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
//         userData: { playerId: otherPoolPlayerId }
//     });
//     await PlayersModel.updateOne(
//         { _id: marketPlayerId },
//         { $set: { dolceUserId: null, gabbanaUserId: null } }
//     ).exec();
//     const saved = await SetPlaysDataModel.updateSetPlay(
//         lineupId,
//         initial[0].selectedSetPlayId,
//         {
//             setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
//             userData: { playerId: marketPlayerId }
//         }
//     );
//     expect(saved[0]).toHaveProperty('userData', { playerId: marketPlayerId });
//     const opponentMarket = await SetPlaysDataModel.saveSetPlays(
//         opponentLineupId,
//         {
//             setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
//             userData: { playerId: ownPlayerIds[0] }
//         }
//     );
//     await expect(
//         SetPlaysDataModel.updateSetPlay(
//             opponentLineupId,
//             opponentMarket[0].selectedSetPlayId,
//             {
//                 setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
//                 userData: { playerId: opponentPlayerIds[0] }
//             }
//         )
//     ).rejects.toThrow();
//     const opponentReserve = await SetPlaysDataModel.saveSetPlays(
//         opponentLineupId,
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: opponentPlayerIds[5] }
//         }
//     );
//     await expect(
//         SetPlaysDataModel.updateSetPlay(
//             opponentLineupId,
//             opponentReserve[1].selectedSetPlayId,
//             {
//                 setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//                 userData: { playerId: ownPlayerIds[0] }
//             }
//         )
//     ).rejects.toThrow();
// });

// test('Should resolves the opponent from the schedule and requires the appropriate opponent data', async () => {
//     await StartingLineupModel.deleteOne({ _id: opponentLineupId }).exec();
//     await expect(
//         SetPlaysDataModel.saveSetPlays(lineupId, {
//             setPlayId: catalogId(SetPlayEnumType.Typer),
//             userData: {
//                 playerId: ownPlayerIds[0],
//                 attemptOne: {
//                     heatOne: 0,
//                     heatTwo: 1,
//                     heatThree: 2,
//                     heatFour: 3
//                 },
//                 attemptTwo: {
//                     heatOne: 3,
//                     heatTwo: 2,
//                     heatThree: 1,
//                     heatFour: 0
//                 }
//             }
//         })
//     ).rejects.toThrow('Opponent starting lineup not found');
//     // Avatar needs the opponent squad, but not their submitted starting lineup.
//     await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.Awatar),
//         userData: { playerId: ownPlayerIds[5] }
//     });
//     await ScheduleModel.deleteMany().exec();
//     await expect(
//         SetPlaysDataModel.saveSetPlays(lineupId, {
//             setPlayId: catalogId(SetPlayEnumType.Awatar),
//             userData: { playerId: marketPlayerId }
//         })
//     ).rejects.toThrow('Scheduled opponent not found');
//     await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.RyszardKowalski),
//         userData: { playerId: ownPlayerIds[0] }
//     });
// });

// test('Should rejects Spartacus in round one using the lineup round', async () => {
//     const firstLineup = await createLineup(ownUserId, ownPlayerIds, 1);
//     await ScheduleModel.create({
//         userOneId: ownUserId,
//         userTwoId: opponentUserId,
//         roundNumber: 1
//     });
//     await expect(
//         SetPlaysDataModel.saveSetPlays(firstLineup._id.toString(), {
//             setPlayId: catalogId(SetPlayEnumType.Spartacus),
//             userData: {
//                 ownPlayerId: ownPlayerIds[0],
//                 opponentPlayerId: opponentPlayerIds[0]
//             }
//         })
//     ).rejects.toThrow('Spartacus is available from round two');
//     expect(await getStoredSetPlays(firstLineup._id.toString())).toEqual([]);
// });

// test('Should persists each admin result shape including explicit false and fractional averages', async () => {
//     const saved = await addSelectedSetPlays(lineupId, [
//         { setPlayId: catalogId(SetPlayEnumType.Remis) },
//         { setPlayId: catalogId(SetPlayEnumType.Ncd) },
//         { setPlayId: catalogId(SetPlayEnumType.Ncd6) },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Spartacus),
//             userData: {
//                 ownPlayerId: ownPlayerIds[0],
//                 opponentPlayerId: opponentPlayerIds[0]
//             }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
//             userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Awatar),
//             userData: { playerId: marketPlayerId }
//         }
//     ]);
//     const results = [
//         { playerIdList: [ownPlayerIds[0]] },
//         { playerIdList: ownPlayerIds.slice(0, 4) },
//         { playerIdList: opponentPlayerIds.slice(0, 4) },
//         { ownAverage: 2.25, opponentAverage: 1.75 },
//         {
//             leaders: ownPlayerIds.slice(0, 4).map((playerId, index) => {
//                 return {
//                     playerId,
//                     scoredMore: index === 1
//                 };
//             })
//         },
//         { heatOne: 0, heatSeven: 2 }
//     ];
//     for (let index = 0; index < saved.length; index++) {
//         await SetPlaysDataModel.saveSetPlayResults(
//             lineupId,
//             saved[index].selectedSetPlayId,
//             results[index]
//         );
//     }
//     expect(await getStoredSetPlays(lineupId)).toEqual(
//         saved.map((play, index) => {
//             return {
//                 ...play,
//                 adminData:
//                     index === 5
//                         ? {
//                               heatOne: 0,
//                               heatTwo: 0,
//                               heatThree: 0,
//                               heatFour: 0,
//                               heatFive: 0,
//                               heatSix: 0,
//                               heatSeven: 2
//                           }
//                         : results[index]
//             };
//         })
//     );
// });

// test('Should defaults omitted Brudna Pala result checkboxes to false', async () => {
//     const saved = await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
//         userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
//     });
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             leaders: [
//                 { playerId: ownPlayerIds[0] },
//                 { playerId: ownPlayerIds[1], scoredMore: true },
//                 { playerId: ownPlayerIds[2], scoredMore: false },
//                 { playerId: ownPlayerIds[3] }
//             ]
//         }
//     );
//     const plays = await getStoredSetPlays(lineupId);
//     expect(plays[0]).toHaveProperty('adminData', {
//         leaders: ownPlayerIds.slice(0, 4).map((playerId, index) => {
//             return {
//                 playerId,
//                 scoredMore: index === 1
//             };
//         })
//     });
// });

// test('Should defaults market reserve heats to zero before admin results are submitted', async () => {
//     const saved = await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
//         userData: { playerId: marketPlayerId }
//     });
//     expect(saved[0]).toHaveProperty('adminData', DEFAULT_PLAYER_SCORE_DETAILS);
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {}
//     );
//     expect((await getStoredSetPlays(lineupId))[0]).toEqual({
//         ...saved[0],
//         adminData: {
//             heatOne: 0,
//             heatTwo: 0,
//             heatThree: 0,
//             heatFour: 0,
//             heatFive: 0,
//             heatSix: 0,
//             heatSeven: 0
//         }
//     });
// });

// test('Should rejects incomplete, foreign and malformed admin results without losing valid results', async () => {
//     const saved = await addSelectedSetPlays(lineupId, [
//         { setPlayId: catalogId(SetPlayEnumType.Remis) },
//         { setPlayId: catalogId(SetPlayEnumType.Ncd) },
//         { setPlayId: catalogId(SetPlayEnumType.Ncd6) },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Spartacus),
//             userData: {
//                 ownPlayerId: ownPlayerIds[0],
//                 opponentPlayerId: opponentPlayerIds[0]
//             }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
//             userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: ownPlayerIds[5] }
//         }
//     ]);
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             playerIdList: []
//         }
//     );
//     const before = await getStoredSetPlays(lineupId);
//     const leaders = ownPlayerIds
//         .slice(0, 4)
//         .map(playerId => ({ playerId, scoredMore: false }));
//     const invalid: [number, unknown][] = [
//         [0, {}],
//         [0, { playerIdList: [opponentPlayerIds[0]] }],
//         [0, { playerIdList: [ownPlayerIds[0], ownPlayerIds[0]] }],
//         [1, { playerIdList: ownPlayerIds.slice(0, 3) }],
//         [
//             1,
//             {
//                 playerIdList: [
//                     ownPlayerIds[0],
//                     ownPlayerIds[0],
//                     ownPlayerIds[1],
//                     ownPlayerIds[2]
//                 ]
//             }
//         ],
//         [
//             1,
//             {
//                 playerIdList: [
//                     ...ownPlayerIds.slice(0, 3),
//                     new mongoose.Types.ObjectId().toString()
//                 ]
//             }
//         ],
//         [2, { playerIdList: ownPlayerIds.slice(0, 3) }],
//         [3, { ownAverage: 2 }],
//         [3, { ownAverage: -1, opponentAverage: 2 }],
//         [4, { leaders: leaders.slice(0, 3) }],
//         [4, { leaders: [leaders[0], leaders[0], leaders[1], leaders[2]] }],
//         [
//             4,
//             {
//                 leaders: [
//                     ...leaders.slice(0, 3),
//                     { playerId: marketPlayerId, scoredMore: true }
//                 ]
//             }
//         ],
//         [
//             4,
//             {
//                 leaders: [
//                     ...leaders.slice(0, 3),
//                     { playerId: ownPlayerIds[3], scoredMore: 'yes' }
//                 ]
//             }
//         ],
//         [5, { heatOne: -1 }],
//         [5, { heatOne: 101 }],
//         [5, { heatOne: NaN }],
//         [5, { heatOne: '3' }]
//     ];
//     for (const [index, input] of invalid) {
//         await expect(
//             SetPlaysDataModel.saveSetPlayResults(
//                 lineupId,
//                 saved[index].selectedSetPlayId,
//                 input as SetPlayAdminInputType
//             )
//         ).rejects.toThrow();
//     }
//     expect(await getStoredSetPlays(lineupId)).toEqual(before);
// });

// test('Should rejects results for every type without admin inputs', async () => {
//     const selections: SetPlayDataType[] = [
//         {
//             setPlayId: catalogId(SetPlayEnumType.GwarancjaStartow),
//             userData: { playerId: ownPlayerIds[0] }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.MortalKombatCombo)
//         },
//         { setPlayId: catalogId(SetPlayEnumType.Muchomor) },
//         { setPlayId: catalogId(SetPlayEnumType.PijanyCieslak) },
//         { setPlayId: catalogId(SetPlayEnumType.PauloSousa) },
//         {
//             setPlayId: catalogId(SetPlayEnumType.RyszardKowalski),
//             userData: { playerId: ownPlayerIds[0] }
//         },
//         {
//             setPlayId: catalogId(SetPlayEnumType.Typer),
//             userData: {
//                 playerId: ownPlayerIds[0],
//                 attemptOne: {
//                     heatOne: 3,
//                     heatTwo: 0,
//                     heatThree: 1,
//                     heatFour: 2
//                 },
//                 attemptTwo: {
//                     heatOne: 0,
//                     heatTwo: 3,
//                     heatThree: 2,
//                     heatFour: 1
//                 }
//             }
//         },
//         { setPlayId: catalogId(SetPlayEnumType.Taktyczna) },
//         {
//             setPlayId: catalogId(SetPlayEnumType.KoloFortunyNorbiego),
//             userData: { minimum: 10.5, maximum: 10.5 }
//         }
//     ];
//     for (const selection of selections) {
//         const saved = await SetPlaysDataModel.saveSetPlays(lineupId, selection);
//         await expect(
//             SetPlaysDataModel.saveSetPlayResults(
//                 lineupId,
//                 saved[0].selectedSetPlayId,
//                 {}
//             )
//         ).rejects.toThrow();
//         expect(await getStoredSetPlays(lineupId)).toEqual(saved);
//         await SetPlaysDataModel.removeSetPlay(
//             lineupId,
//             saved[0].selectedSetPlayId
//         );
//     }
// });

// test('Should targets one of two identical-type plays without changing the other results', async () => {
//     const saved = await addSelectedSetPlays(lineupId, [
//         { setPlayId: catalogId(SetPlayEnumType.Remis) },
//         { setPlayId: catalogId(SetPlayEnumType.Remis) }
//     ]);
//     expect(saved[0].selectedSetPlayId).not.toBe(saved[1].selectedSetPlayId);
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             playerIdList: [ownPlayerIds[0]]
//         }
//     );
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[1].selectedSetPlayId,
//         {
//             playerIdList: []
//         }
//     );
//     expect(await getStoredSetPlays(lineupId)).toEqual([
//         { ...saved[0], adminData: { playerIdList: [ownPlayerIds[0]] } },
//         { ...saved[1], adminData: { playerIdList: [] } }
//     ]);
// });

// test('Should rejects caller-supplied purchase identities and unknown, removed or foreign edit targets', async () => {
//     const own = await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.Remis)
//     });
//     const foreign = await SetPlaysDataModel.saveSetPlays(opponentLineupId, {
//         setPlayId: catalogId(SetPlayEnumType.Remis)
//     });
//     for (const id of [
//         'invalid',
//         new mongoose.Types.ObjectId().toString(),
//         foreign[0].selectedSetPlayId
//     ]) {
//         await expect(
//             SetPlaysDataModel.updateSetPlay(lineupId, id, {
//                 setPlayId: catalogId(SetPlayEnumType.Muchomor)
//             })
//         ).rejects.toThrow();
//         await expect(
//             SetPlaysDataModel.removeSetPlay(lineupId, id)
//         ).rejects.toThrow();
//         await expect(
//             SetPlaysDataModel.saveSetPlayResults(lineupId, id, {
//                 playerIdList: []
//             })
//         ).rejects.toThrow();
//         const injected = {
//             selectedSetPlayId: id,
//             setPlayId: catalogId(SetPlayEnumType.Remis)
//         };
//         await expect(
//             SetPlaysDataModel.saveSetPlays(lineupId, injected)
//         ).rejects.toThrow('Supply selectedSetPlayId as the edit target');
//     }
//     const injected = {
//         selectedSetPlayId: own[0].selectedSetPlayId,
//         setPlayId: own[0].setPlayId
//     };
//     await expect(
//         SetPlaysDataModel.saveSetPlays(lineupId, injected)
//     ).rejects.toThrow('Supply selectedSetPlayId as the edit target');
//     expect(await getStoredSetPlays(lineupId)).toEqual(own);
//     expect(await getStoredSetPlays(opponentLineupId)).toEqual(foreign);
//     await SetPlaysDataModel.removeSetPlay(lineupId, own[0].selectedSetPlayId);
//     await expect(
//         SetPlaysDataModel.updateSetPlay(lineupId, own[0].selectedSetPlayId, {
//             setPlayId: catalogId(SetPlayEnumType.Muchomor)
//         })
//     ).rejects.toThrow();
// });

// test('Should individual edits enforce occurrence limits and reject admin-data injection', async () => {
//     const saved = await addSelectedSetPlays(lineupId, [
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: ownPlayerIds[5] }
//         },
//         { setPlayId: catalogId(SetPlayEnumType.Muchomor) },
//         { setPlayId: catalogId(SetPlayEnumType.Muchomor) },
//         { setPlayId: catalogId(SetPlayEnumType.Remis) }
//     ]);
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[3].selectedSetPlayId,
//         {
//             playerIdList: []
//         }
//     );
//     const before = await getStoredSetPlays(lineupId);
//     await expect(
//         SetPlaysDataModel.updateSetPlay(lineupId, saved[3].selectedSetPlayId, {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: ownPlayerIds[0] }
//         })
//     ).rejects.toThrow();
//     await expect(
//         SetPlaysDataModel.updateSetPlay(lineupId, saved[3].selectedSetPlayId, {
//             setPlayId: catalogId(SetPlayEnumType.Muchomor)
//         })
//     ).rejects.toThrow();
//     const injected = {
//         setPlayId: catalogId(SetPlayEnumType.Remis),
//         adminData: { playerIdList: [ownPlayerIds[0]] }
//     };
//     await expect(
//         SetPlaysDataModel.updateSetPlay(
//             lineupId,
//             saved[3].selectedSetPlayId,
//             injected as SetPlayDataType
//         )
//     ).rejects.toThrow();
//     expect(await getStoredSetPlays(lineupId)).toEqual(before);
// });

// test('Should individual edits clear changed results and preserve other selections', async () => {
//     const saved = await addSelectedSetPlays(lineupId, [
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: ownPlayerIds[5] }
//         },
//         { setPlayId: catalogId(SetPlayEnumType.Remis) }
//     ]);
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             heatOne: 3
//         }
//     );
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[1].selectedSetPlayId,
//         {
//             playerIdList: []
//         }
//     );
//     const changed = await SetPlaysDataModel.updateSetPlay(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//             userData: { playerId: ownPlayerIds[0] }
//         }
//     );
//     expect(changed).toEqual([
//         {
//             ...saved[0],
//             userData: { playerId: ownPlayerIds[0] },
//             adminData: DEFAULT_PLAYER_SCORE_DETAILS
//         },
//         { ...saved[1], adminData: { playerIdList: [] } }
//     ]);
// });

// test('Should rejects missing lineups on writes and allows a removed play to be replaced', async () => {
//     const missing = new mongoose.Types.ObjectId().toString();
//     await expect(
//         SetPlaysDataModel.getSetPlaysForUser('bad-id')
//     ).rejects.toThrow();
//     expect(await SetPlaysDataModel.getSetPlaysForUser(missing)).toEqual([]);
//     for (const id of ['bad-id', missing]) {
//         await expect(
//             SetPlaysDataModel.saveSetPlays(id, {
//                 setPlayId: catalogId(SetPlayEnumType.Remis)
//             })
//         ).rejects.toThrow();
//     }
//     expect(await getStoredSetPlays(lineupId)).toEqual([]);
//     await expect(
//         SetPlaysDataModel.removeSetPlay(lineupId, missing)
//     ).rejects.toThrow();
//     await expect(
//         SetPlaysDataModel.updateSetPlay(lineupId, missing, {
//             setPlayId: catalogId(SetPlayEnumType.Remis)
//         })
//     ).rejects.toThrow();
//     await expect(
//         SetPlaysDataModel.saveSetPlayResults(lineupId, missing, {})
//     ).rejects.toThrow();
//     const saved = await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//         userData: { playerId: ownPlayerIds[5] }
//     });
//     await SetPlaysDataModel.removeSetPlay(lineupId, saved[0].selectedSetPlayId);
//     const replacement = await SetPlaysDataModel.saveSetPlays(lineupId, {
//         setPlayId: catalogId(SetPlayEnumType.Rezerwa),
//         userData: { playerId: ownPlayerIds[0] }
//     });
//     expect(replacement[0].selectedSetPlayId).not.toBe(
//         saved[0].selectedSetPlayId
//     );
// });

// test('Should rejects catalog metadata and selection changes through actor operations', async () => {
//     const selection = { setPlayId: catalogId(SetPlayEnumType.Remis) };
//     const [saved] = await SetPlaysDataModel.saveSetPlays(lineupId, selection);
//     const results = { playerIdList: [ownPlayerIds[0]] };
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved.selectedSetPlayId,
//         results
//     );
//     for (const field of [
//         { name: 'Forged name' },
//         { type: SetPlayEnumType.Muchomor },
//         { adminData: results }
//     ]) {
//         await expect(
//             SetPlaysDataModel.saveSetPlays(lineupId, { ...selection, ...field })
//         ).rejects.toThrow();
//         await expect(
//             SetPlaysDataModel.updateSetPlay(lineupId, saved.selectedSetPlayId, {
//                 ...selection,
//                 ...field
//             })
//         ).rejects.toThrow();
//     }
//     for (const field of [
//         { setPlayId: catalogId(SetPlayEnumType.Muchomor) },
//         { userData: { playerId: marketPlayerId } },
//         { type: SetPlayEnumType.Muchomor },
//         { name: 'Forged name' }
//     ]) {
//         await expect(
//             SetPlaysDataModel.saveSetPlayResults(
//                 lineupId,
//                 saved.selectedSetPlayId,
//                 {
//                     ...results,
//                     ...field
//                 }
//             )
//         ).rejects.toThrow();
//     }
//     expect(await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)).toEqual([
//         { name: 'Remis', adminData: results }
//     ]);
// });

// test('Should rejects missing, malformed and unknown catalog references without partial writes', async () => {
//     const selection = { setPlayId: catalogId(SetPlayEnumType.Remis) };
//     const [saved] = await SetPlaysDataModel.saveSetPlays(lineupId, selection);
//     for (const setPlayId of [
//         undefined,
//         'bad-id',
//         new mongoose.Types.ObjectId().toString()
//     ]) {
//         const invalid = { setPlayId } as SetPlayDataType;
//         await expect(
//             SetPlaysDataModel.saveSetPlays(lineupId, invalid)
//         ).rejects.toThrow();
//         await expect(
//             SetPlaysDataModel.updateSetPlay(
//                 lineupId,
//                 saved.selectedSetPlayId,
//                 invalid
//             )
//         ).rejects.toThrow();
//     }
//     await expect(
//         SetPlaysDataModel.create({
//             startingLineupId: opponentLineupId,
//             setPlayList: [{}]
//         })
//     ).rejects.toThrow();
//     expect(await getStoredSetPlays(lineupId)).toEqual([saved]);
//     expect(
//         await SetPlaysDataModel.getSetPlaysForUser(opponentLineupId)
//     ).toEqual([]);
// });

// test('Should counts catalog aliases by type and replaces a purchase when its catalog reference changes', async () => {
//     const [second, third] = await SetPlaysModel.create([
//         { name: 'Second draw play', type: SetPlayEnumType.Remis },
//         { name: 'Third draw play', type: SetPlayEnumType.Remis }
//     ]);
//     const firstSelection = { setPlayId: catalogId(SetPlayEnumType.Remis) };
//     const secondSelection = { setPlayId: second._id.toString() };
//     const thirdSelection = { setPlayId: third._id.toString() };
//     const saved = await addSelectedSetPlays(lineupId, [
//         firstSelection,
//         secondSelection
//     ]);
//     await expect(
//         SetPlaysDataModel.saveSetPlays(lineupId, thirdSelection)
//     ).rejects.toThrow('may be selected at most 2');
//     await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         {
//             playerIdList: []
//         }
//     );
//     const evaluated = await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[1].selectedSetPlayId,
//         {
//             playerIdList: [ownPlayerIds[0]]
//         }
//     );
//     const replaced = await SetPlaysDataModel.updateSetPlay(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         thirdSelection
//     );
//     expect(replaced[0]).toEqual({
//         selectedSetPlayId: expect.any(String),
//         setPlayId: third._id.toString(),
//         name: 'Third draw play',
//         type: SetPlayEnumType.Remis
//     });
//     expect(replaced[0].selectedSetPlayId).toBe(saved[0].selectedSetPlayId);
//     expect(replaced[1]).toEqual(evaluated[1]);
//     await expect(
//         SetPlaysDataModel.saveSetPlayResults(
//             lineupId,
//             saved[0].selectedSetPlayId,
//             {
//                 playerIdList: []
//             }
//         )
//     ).rejects.toThrow('Invalid selectedSetPlayId');
// });

// test('Should ignores unrelated unknown fields in selections, results and Mongoose documents', async () => {
//     const selection = {
//         setPlayId: catalogId(SetPlayEnumType.Spartacus),
//         opponentId: new mongoose.Types.ObjectId().toString(),
//         userData: {
//             ownPlayerId: ownPlayerIds[0],
//             opponentPlayerId: opponentPlayerIds[0],
//             extra: true
//         }
//     } as const;
//     const saved = await SetPlaysDataModel.saveSetPlays(lineupId, selection);
//     expect(saved[0]).toHaveProperty('userData', {
//         ownPlayerId: ownPlayerIds[0],
//         opponentPlayerId: opponentPlayerIds[0]
//     });
//     expect(saved[0]).not.toHaveProperty('opponentId');
//     const results = {
//         ownAverage: 2,
//         opponentAverage: 1,
//         checkbox: true
//     };
//     const updated = await SetPlaysDataModel.saveSetPlayResults(
//         lineupId,
//         saved[0].selectedSetPlayId,
//         results
//     );
//     expect(updated[0]).toHaveProperty('adminData', {
//         ownAverage: 2,
//         opponentAverage: 1
//     });
//     const document = await SetPlaysDataModel.findOne({
//         startingLineupId: lineupId
//     }).exec();
//     if (!document) {
//         throw new Error('Missing set-play document');
//     }
//     document.set('extra', true);
//     document.set('setPlayList.0.userData.extra', true);
//     document.set('setPlayList.0.adminData.extra', true);
//     await document.save();
//     const persisted = await SetPlaysDataModel.findById(document._id)
//         .lean()
//         .exec();
//     expect(persisted).not.toHaveProperty('extra');
//     expect(persisted?.setPlayList[0]).not.toHaveProperty('userData.extra');
//     expect(persisted?.setPlayList[0]).toHaveProperty('adminData', {
//         ownAverage: 2,
//         opponentAverage: 1
//     });
// });

// test('Should rejects list payloads on save and edit without changing saved selections', async () => {
//     const play = { setPlayId: catalogId(SetPlayEnumType.Remis) };
//     const saved = await SetPlaysDataModel.saveSetPlays(lineupId, play);
//     await expect(
//         // @ts-expect-error Saving accepts one play, not a list.
//         SetPlaysDataModel.saveSetPlays(lineupId, [play])
//     ).rejects.toThrow('Invalid set play selection');
//     await expect(
//         // @ts-expect-error Editing accepts one play, not a list.
//         SetPlaysDataModel.updateSetPlay(lineupId, saved[0].selectedSetPlayId, [
//             play
//         ])
//     ).rejects.toThrow('Invalid set play selection');
//     expect(await getStoredSetPlays(lineupId)).toEqual(saved);
// });

// test('Should rejects an edit without a target instead of appending a play', async () => {
//     const play = { setPlayId: catalogId(SetPlayEnumType.Remis) };
//     const saved = await SetPlaysDataModel.saveSetPlays(lineupId, play);
//     await expect(
//         // @ts-expect-error An edit must identify an existing selection.
//         SetPlaysDataModel.updateSetPlay(lineupId, undefined, play)
//     ).rejects.toThrow();
//     expect(await getStoredSetPlays(lineupId)).toEqual(saved);
// });
