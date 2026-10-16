import type {
    SetPlayAdminInputType,
    SetPlaySelectionType,
    SetPlayUpdateType,
    PopulatedSetPlaysDataType
} from '@/db/models/games/set-plays-data';

import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import { DEFAULT_PLAYER_SCORE_DETAILS } from '@/db/db.types';
import ScheduleModel from '@/db/models/games/schedule';
import SetPlaysDataModel from '@/db/models/games/set-plays-data';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import LigueGroupsModel from '@/db/models/ligue-groups';
import PlayersModel from '@/db/models/players';
import { SetPlayEnumType } from '@/db/models/schema.types';
import SetPlaysModel from '@/db/models/set-plays';
import UserModel from '@/db/models/user';
import { validateSetPlayConstraints } from '@/db/models/validation.utils';

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
let catalogIds: Map<SetPlayEnumType, string>;

function catalogId(type: SetPlayEnumType): string {
    const id = catalogIds.get(type);
    if (!id) {
        throw new Error('Missing catalog fixture');
    }
    return id;
}

let lineupId: string;
let opponentLineupId: string;
let ownPlayerIds: string[];
let opponentPlayerIds: string[];
let marketPlayerId: string;
let inactivePlayerId: string;
let otherPoolPlayerId: string;
let ownUserId: string;
let opponentUserId: string;

async function getStoredSetPlays(startingLineupId: string) {
    const document = await SetPlaysDataModel.findOne({ startingLineupId })
        .populate({ path: 'setPlayList.setPlayId', select: 'name type' })
        .exec();
    if (!document) {
        return [];
    }
    return document
        .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
        .setPlayList.map(({ _id, setPlayId, ...play }) => {
            if (!setPlayId) {
                throw new Error('Missing catalog entry');
            }
            return {
                ...play,
                setPlayId: setPlayId._id.toString(),
                name: setPlayId.name,
                type: setPlayId.type,
                playId: _id.toString()
            };
        });
}

const clearFixtures = async () => {
    await SetPlaysDataModel.deleteMany();
    await SetPlaysModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await ScheduleModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
};

const createLineup = async (
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

test('stores a catalog reference and reads the current catalog name', async () => {
    const catalogPlay = await SetPlaysModel.create({
        name: 'Remis',
        type: SetPlayEnumType.Remis
    });
    const setPlayId = catalogPlay._id.toString();
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId }
    ]);
    const stored = await SetPlaysDataModel.collection.findOne({
        startingLineupId: new mongoose.Types.ObjectId(lineupId)
    });
    expect(stored?.setPlayList).toEqual([
        {
            _id: new mongoose.Types.ObjectId(saved[0].playId),
            setPlayId: catalogPlay._id
        }
    ]);
    expect(SetPlaysDataModel.collection.name).not.toBe(
        SetPlaysModel.collection.name
    );
    await SetPlaysModel.updateOne(
        { _id: catalogPlay._id },
        { name: 'Remis – zmieniona nazwa' }
    ).exec();
    expect(await SetPlaysDataModel.getSetPlaysForUser(lineupId)).toEqual([
        { name: 'Remis – zmieniona nazwa', userData: {} }
    ]);
    expect(await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)).toEqual([
        { name: 'Remis – zmieniona nazwa', adminData: {} }
    ]);
});

beforeEach(async () => {
    await clearFixtures();
    const catalog = await SetPlaysModel.create(
        Object.values(SetPlayEnumType).map(type => {
            return { type, name: catalogNames[type] };
        })
    );
    catalogIds = new Map(catalog.map(play => [play.type, play._id.toString()]));
    const groups = await LigueGroupsModel.create([
        { groupName: 'dolce' },
        { groupName: 'gabbana' }
    ]);
    const users = await UserModel.create(
        groups.map((group, index) => {
            return {
                username: `set-play-user-${index}`,
                coachName: `Coach ${index}`,
                email: `set-play-${index}@example.com`,
                password: 'Password1!',
                teamName: `Team ${index}`,
                logoUrl: 'https://example.com/logo.png',
                groupName: group._id
            };
        })
    );
    ownUserId = users[0]._id.toString();
    opponentUserId = users[1]._id.toString();
    const players = await PlayersModel.create([
        ...Array.from({ length: 6 }, (_, index) => {
            return {
                extraligaPlayerName: `Own ${index}`,
                dolceUserId: ownUserId
            };
        }),
        ...Array.from({ length: 6 }, (_, index) => {
            return {
                extraligaPlayerName: `Opponent ${index}`,
                gabbanaUserId: opponentUserId
            };
        }),
        { extraligaPlayerName: 'Market' },
        { extraligaPlayerName: 'Inactive', playerStatus: 'inactive' },
        { extraligaPlayerName: 'Other pool', gabbanaUserId: opponentUserId }
    ]);
    ownPlayerIds = players.slice(0, 6).map(player => player._id.toString());
    opponentPlayerIds = players
        .slice(6, 12)
        .map(player => player._id.toString());
    marketPlayerId = players[12]._id.toString();
    inactivePlayerId = players[13]._id.toString();
    otherPoolPlayerId = players[14]._id.toString();
    const lineup = await createLineup(ownUserId, ownPlayerIds);
    const opponentLineup = await createLineup(
        opponentUserId,
        opponentPlayerIds
    );
    lineupId = lineup._id.toString();
    opponentLineupId = opponentLineup._id.toString();
    await ScheduleModel.create({
        userOneId: opponentUserId,
        userTwoId: ownUserId,
        roundNumber: 2
    });
});

afterAll(async () => {
    await clearFixtures();
    await mongoose.disconnect();
    jest.restoreAllMocks();
});

describe('validateSetPlayConstraints', () => {
    test('returns every type when no set plays have been selected', () => {
        const document = { setPlayList: [] };

        expect(validateSetPlayConstraints(document.setPlayList)).toEqual(
            Object.values(SetPlayEnumType)
        );
    });

    test.each([6, 7])('returns no available types at %i selections', count => {
        const document = {
            setPlayList: Array.from({ length: count }, () => {
                return { type: SetPlayEnumType.Remis };
            })
        };

        expect(validateSetPlayConstraints(document.setPlayList)).toEqual([]);
    });

    test.each(Object.values(SetPlayEnumType))(
        'keeps %s available below its limit and excludes it at its limit',
        type => {
            const maximum =
                type === SetPlayEnumType.Rezerwa ||
                type === SetPlayEnumType.RezerwaGielda
                    ? 1
                    : 2;
            const document = {
                setPlayList: Array.from({ length: maximum - 1 }, () => {
                    return { type };
                })
            };

            expect(validateSetPlayConstraints(document.setPlayList)).toEqual(
                Object.values(SetPlayEnumType)
            );

            document.setPlayList.push({ type });

            expect(validateSetPlayConstraints(document.setPlayList)).toEqual(
                Object.values(SetPlayEnumType).filter(availableType => {
                    return availableType !== type;
                })
            );
        }
    );

    test('filters each exhausted type independently with one total selection remaining', () => {
        const document = {
            setPlayList: [
                SetPlayEnumType.Remis,
                SetPlayEnumType.Remis,
                SetPlayEnumType.Rezerwa,
                SetPlayEnumType.RezerwaGielda,
                SetPlayEnumType.Muchomor
            ].map(type => {
                return { type };
            })
        };

        expect(validateSetPlayConstraints(document.setPlayList)).toEqual(
            Object.values(SetPlayEnumType).filter(type => {
                return (
                    type !== SetPlayEnumType.Remis &&
                    type !== SetPlayEnumType.Rezerwa &&
                    type !== SetPlayEnumType.RezerwaGielda
                );
            })
        );
    });

    test('counts different catalog entries of the same type together', async () => {
        const anotherDraw = await SetPlaysModel.create({
            name: 'Remis – drugi wpis',
            type: SetPlayEnumType.Remis
        });
        const document = {
            setPlayList: [
                {
                    setPlayId: catalogId(SetPlayEnumType.Remis),
                    type: SetPlayEnumType.Remis
                },
                { setPlayId: anotherDraw._id, type: anotherDraw.type }
            ]
        };

        expect(validateSetPlayConstraints(document.setPlayList)).not.toContain(
            SetPlayEnumType.Remis
        );
    });
});

describe('getSetPlayListByStartingLineupId', () => {
    test('returns an empty list when no selections document exists', async () => {
        expect(
            await SetPlaysDataModel.getSetPlayListByStartingLineupId(lineupId)
        ).toEqual({ setPlayList: [] });
    });

    test('returns only the requested lineup’s populated selections as plain objects', async () => {
        const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
            { setPlayId: catalogId(SetPlayEnumType.Remis) },
            {
                setPlayId: catalogId(SetPlayEnumType.Rezerwa),
                userData: { playerId: ownPlayerIds[5] }
            }
        ]);
        await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
            playerIdList: [ownPlayerIds[0]]
        });
        await SetPlaysDataModel.saveSetPlays(opponentLineupId, [
            { setPlayId: catalogId(SetPlayEnumType.Muchomor) }
        ]);
        await SetPlaysModel.updateOne(
            { _id: catalogId(SetPlayEnumType.Remis) },
            { name: 'Remis – zmieniona nazwa' }
        ).exec();

        const result =
            await SetPlaysDataModel.getSetPlayListByStartingLineupId(lineupId);

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
        expect(validateSetPlayConstraints(result.setPlayList)).not.toContain(
            SetPlayEnumType.Rezerwa
        );
    });
});

test.each([
    [SetPlayEnumType.GwarancjaStartow, () => ({ playerId: ownPlayerIds[0] })],
    [SetPlayEnumType.Remis, () => undefined],
    [SetPlayEnumType.Rezerwa, () => ({ playerId: ownPlayerIds[5] })],
    [SetPlayEnumType.RezerwaGielda, () => ({ playerId: marketPlayerId })],
    [SetPlayEnumType.MortalKombatCombo, () => undefined],
    [SetPlayEnumType.Muchomor, () => undefined],
    [SetPlayEnumType.Ncd, () => undefined],
    [SetPlayEnumType.Ncd6, () => undefined],
    [
        SetPlayEnumType.Spartacus,
        () => {
            return {
                ownPlayerId: ownPlayerIds[5],
                opponentPlayerId: opponentPlayerIds[5]
            };
        }
    ],
    [SetPlayEnumType.PijanyCieslak, () => undefined],
    [
        SetPlayEnumType.BrudnaPala,
        () => ({ leaderIdList: ownPlayerIds.slice(0, 4) })
    ],
    [SetPlayEnumType.PauloSousa, () => undefined],
    [SetPlayEnumType.RyszardKowalski, () => ({ playerId: ownPlayerIds[1] })],
    [
        SetPlayEnumType.Typer,
        () => {
            return {
                playerId: opponentPlayerIds[0],
                attemptOne: {
                    heatOne: 3,
                    heatTwo: 0,
                    heatThree: 1,
                    heatFour: 2
                },
                attemptTwo: {
                    heatOne: 1,
                    heatTwo: 2,
                    heatThree: 0,
                    heatFour: 3
                }
            };
        }
    ],
    [SetPlayEnumType.Taktyczna, () => undefined],
    [SetPlayEnumType.Awatar, () => ({ playerId: marketPlayerId })],
    [SetPlayEnumType.KoloFortunyNorbiego, () => ({ minimum: 10, maximum: 20 })]
])(
    'persists the complete %s selection with a stable identity',
    async (type, userData) => {
        const data = userData();
        const payload = {
            setPlayId: catalogId(type),

            ...(data === undefined ? {} : { userData: data })
        } as SetPlaySelectionType;
        const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [payload]);
        expect(await SetPlaysDataModel.getSetPlaysForUser(lineupId)).toEqual([
            {
                name: catalogNames[type],
                userData: data ?? {}
            }
        ]);
        if (data === undefined) {
            expect(saved[0]).not.toHaveProperty('userData');
            const document = await SetPlaysDataModel.findOne({
                startingLineupId: lineupId
            })
                .lean()
                .exec();
            expect(document?.setPlayList[0]).not.toHaveProperty('userData');
        }
        expect(await getStoredSetPlays(lineupId)).toEqual([
            {
                playId: saved[0].playId,
                ...payload,
                type,
                name: catalogNames[type],
                ...([
                    SetPlayEnumType.Rezerwa,
                    SetPlayEnumType.RezerwaGielda,
                    SetPlayEnumType.Awatar
                ].some(heatType => heatType === type)
                    ? { adminData: DEFAULT_PLAYER_SCORE_DETAILS }
                    : {})
            }
        ]);
    }
);

test('returns only user-facing names and inputs for the requested lineup', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) },
        {
            setPlayId: catalogId(SetPlayEnumType.GwarancjaStartow),
            userData: { playerId: ownPlayerIds[0] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
            userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
        }
    ]);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
        playerIdList: [ownPlayerIds[0]]
    });
    expect(await SetPlaysDataModel.getSetPlaysForUser(lineupId)).toEqual([
        { name: 'Remis', userData: {} },
        {
            name: 'Gwarancja startów',
            userData: { playerId: ownPlayerIds[0] }
        },
        {
            name: 'Brudna pała',
            userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
        }
    ]);
    expect(
        await SetPlaysDataModel.getSetPlaysForUser(opponentLineupId)
    ).toEqual([]);
});

test('returns only admin-facing names and results for the requested user and round', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) },
        {
            setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
            userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.GwarancjaStartow),
            userData: { playerId: ownPlayerIds[0] }
        },
        { setPlayId: catalogId(SetPlayEnumType.Ncd6) }
    ]);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
        playerIdList: [ownPlayerIds[0]]
    });
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[1].playId, {
        leaders: ownPlayerIds.slice(0, 4).map(playerId => ({ playerId }))
    });
    const nextLineup = await createLineup(ownUserId, ownPlayerIds, 3);
    await SetPlaysDataModel.saveSetPlays(nextLineup._id.toString(), [
        { setPlayId: catalogId(SetPlayEnumType.Muchomor) }
    ]);

    expect(await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)).toEqual([
        { name: 'Remis', adminData: { playerIdList: [ownPlayerIds[0]] } },
        {
            name: 'Brudna pała',
            adminData: {
                leaders: ownPlayerIds.slice(0, 4).map(playerId => {
                    return { playerId, scoredMore: false };
                })
            }
        },
        { name: 'Gwarancja startów', adminData: {} },
        { name: 'NCD6', adminData: {} }
    ]);
    expect(await SetPlaysDataModel.getSetPlaysForAdmin(3, ownUserId)).toEqual([
        { name: 'Muchomor', adminData: {} }
    ]);
    expect(
        await SetPlaysDataModel.getSetPlaysForAdmin(2, opponentUserId)
    ).toEqual([]);
    expect(await SetPlaysDataModel.getSetPlaysForAdmin(1, ownUserId)).toEqual(
        []
    );
});

test('saves a complete user selection and reads it without pending admin results', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    expect(saved).toEqual([
        {
            playId: expect.any(String),
            setPlayId: catalogId(SetPlayEnumType.Remis),
            type: SetPlayEnumType.Remis,
            name: 'Remis'
        }
    ]);
    expect(await getStoredSetPlays(lineupId)).toEqual(saved);
});

test('counts plays and rejects invalid type repetitions without changing the saved selection', async () => {
    const six: SetPlaySelectionType[] = [
        { setPlayId: catalogId(SetPlayEnumType.Ncd), userData: {} },
        { setPlayId: catalogId(SetPlayEnumType.Ncd), userData: {} },
        { setPlayId: catalogId(SetPlayEnumType.Ncd6), userData: {} },
        { setPlayId: catalogId(SetPlayEnumType.Ncd6), userData: {} },
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[5] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
            userData: { playerId: marketPlayerId }
        }
    ];
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, six);
    await expect(
        SetPlaysDataModel.saveSetPlays(lineupId, [
            ...six,
            { setPlayId: catalogId(SetPlayEnumType.Muchomor) }
        ])
    ).rejects.toThrow();
    await expect(
        SetPlaysDataModel.saveSetPlays(lineupId, [six[0], six[0], six[0]])
    ).rejects.toThrow();
    for (const reserve of six.slice(4)) {
        await expect(
            SetPlaysDataModel.saveSetPlays(lineupId, [reserve, reserve])
        ).rejects.toThrow();
        await expect(
            SetPlaysDataModel.saveSetPlays(lineupId, [six[4], six[5], reserve])
        ).rejects.toThrow();
    }
    expect(await getStoredSetPlays(lineupId)).toEqual(saved);
});

test('rejects ineligible and nonexistent player selections without partially saving a batch', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    const invalid: SetPlaySelectionType[] = [
        {
            setPlayId: catalogId(SetPlayEnumType.GwarancjaStartow),
            userData: { playerId: ownPlayerIds[5] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.RyszardKowalski),
            userData: { playerId: opponentPlayerIds[0] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: opponentPlayerIds[0] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
            userData: { playerId: ownPlayerIds[0] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.Spartacus),
            userData: {
                ownPlayerId: ownPlayerIds[0],
                opponentPlayerId: ownPlayerIds[0]
            }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.Typer),
            userData: {
                playerId: ownPlayerIds[5],
                attemptOne: {
                    heatOne: 1,
                    heatTwo: 2,
                    heatThree: 3,
                    heatFour: 0
                },
                attemptTwo: {
                    heatOne: 3,
                    heatTwo: 1,
                    heatThree: 0,
                    heatFour: 2
                }
            }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.Awatar),
            userData: { playerId: opponentPlayerIds[0] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
            userData: {
                leaderIdList: [...ownPlayerIds.slice(0, 3), inactivePlayerId]
            }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.Awatar),
            userData: { playerId: new mongoose.Types.ObjectId().toString() }
        }
    ];
    for (const play of invalid) {
        await expect(
            SetPlaysDataModel.saveSetPlays(lineupId, [
                { setPlayId: catalogId(SetPlayEnumType.Muchomor) },
                play
            ])
        ).rejects.toThrow();
        expect(await getStoredSetPlays(lineupId)).toEqual(saved);
    }
});

test('records reserve heat results with zero defaults and keeps other results pending', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[5] }
        },
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
        heatOne: 3,
        heatFour: 0
    });
    expect(await getStoredSetPlays(lineupId)).toEqual([
        {
            ...saved[0],
            adminData: {
                heatOne: 3,
                heatTwo: 0,
                heatThree: 0,
                heatFour: 0,
                heatFive: 0,
                heatSix: 0,
                heatSeven: 0
            }
        },
        saved[1]
    ]);
});

test('edits, reorders and removes individual plays while preserving unrelated results', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[5] }
        },
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
        heatOne: 3
    });
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[1].playId, {
        playerIdList: []
    });
    const evaluated = await getStoredSetPlays(lineupId);
    const reordered = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            playId: saved[1].playId,
            setPlayId: catalogId(SetPlayEnumType.Remis)
        },
        {
            playId: saved[0].playId,
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[5] }
        }
    ]);
    expect(reordered).toEqual([evaluated[1], evaluated[0]]);
    const unchanged = await SetPlaysDataModel.updateSetPlay(
        lineupId,
        saved[0].playId,
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[5] }
        }
    );
    expect(unchanged).toEqual(reordered);
    const edited = await SetPlaysDataModel.updateSetPlay(
        lineupId,
        saved[0].playId,
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[0] }
        }
    );
    expect(edited).toEqual([
        evaluated[1],
        { ...saved[0], userData: { playerId: ownPlayerIds[0] } }
    ]);
    const replaced = await SetPlaysDataModel.updateSetPlay(
        lineupId,
        saved[0].playId,
        {
            setPlayId: catalogId(SetPlayEnumType.Muchomor)
        }
    );
    expect(replaced[1]).toEqual({
        playId: expect.any(String),
        setPlayId: catalogId(SetPlayEnumType.Muchomor),
        type: SetPlayEnumType.Muchomor,
        name: 'Muchomor'
    });
    expect(replaced[1].playId).not.toBe(saved[0].playId);
    await expect(
        SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {})
    ).rejects.toThrow();
    const removed = await SetPlaysDataModel.removeSetPlay(
        lineupId,
        replaced[1].playId
    );
    expect(removed).toEqual([evaluated[1]]);
    expect(
        await SetPlaysDataModel.removeSetPlay(lineupId, saved[1].playId)
    ).toEqual([]);
    expect(await getStoredSetPlays(lineupId)).toEqual([]);
    await expect(
        SetPlaysDataModel.removeSetPlay(lineupId, saved[1].playId)
    ).rejects.toThrow();
});

test('enforces the lineup index and selection limits on persisted documents', async () => {
    await SetPlaysDataModel.saveSetPlays(lineupId, []);
    await expect(
        SetPlaysDataModel.create({
            startingLineupId: lineupId,
            setPlayList: []
        })
    ).rejects.toMatchObject({ code: 11000 });
    await expect(
        SetPlaysDataModel.create({
            startingLineupId: opponentLineupId,
            setPlayList: [
                {
                    setPlayId: catalogId(SetPlayEnumType.Rezerwa),
                    userData: { playerId: opponentPlayerIds[0] }
                },
                {
                    setPlayId: catalogId(SetPlayEnumType.Rezerwa),
                    userData: { playerId: opponentPlayerIds[1] }
                }
            ]
        })
    ).rejects.toThrow();
    expect(await getStoredSetPlays(opponentLineupId)).toEqual([]);
});

test('defaults omitted Typer attempt heats to zero and preserves reported scores', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.Typer),
            userData: {
                playerId: ownPlayerIds[0],
                attemptOne: { heatOne: 100 },
                attemptTwo: { heatFour: 2.5 }
            }
        }
    ]);
    expect(await getStoredSetPlays(lineupId)).toEqual([
        {
            playId: saved[0].playId,
            setPlayId: catalogId(SetPlayEnumType.Typer),
            type: SetPlayEnumType.Typer,
            name: 'Typer',
            userData: {
                playerId: ownPlayerIds[0],
                attemptOne: {
                    heatOne: 100,
                    heatTwo: 0,
                    heatThree: 0,
                    heatFour: 0
                },
                attemptTwo: {
                    heatOne: 0,
                    heatTwo: 0,
                    heatThree: 0,
                    heatFour: 2.5
                }
            }
        }
    ]);
});

test('rejects incomplete, malformed and actor-injected user payloads', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    const attempt = { heatOne: 3, heatTwo: 2, heatThree: 1, heatFour: 0 };
    const invalid: unknown[] = [
        [{ type: 'unknown', userData: {} }],
        [{ setPlayId: catalogId(SetPlayEnumType.Rezerwa), userData: {} }],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.Rezerwa),
                userData: { playerId: 'bad-id' }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.Remis),
                adminData: { playerIdList: [] }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.Spartacus),
                userData: { ownPlayerId: ownPlayerIds[0] }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
                userData: { leaderIdList: ownPlayerIds.slice(0, 3) }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
                userData: {
                    leaderIdList: [
                        ownPlayerIds[0],
                        ownPlayerIds[0],
                        ownPlayerIds[1],
                        ownPlayerIds[2]
                    ]
                }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.Typer),
                userData: { playerId: ownPlayerIds[0], attemptOne: attempt }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.Typer),
                userData: {
                    playerId: ownPlayerIds[0],
                    attemptOne: attempt,
                    attemptTwo: { ...attempt, heatOne: 101 }
                }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.Typer),
                userData: {
                    playerId: ownPlayerIds[0],
                    attemptOne: attempt,
                    attemptTwo: { ...attempt, heatOne: NaN }
                }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.KoloFortunyNorbiego),
                userData: { minimum: 20, maximum: 10 }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.KoloFortunyNorbiego),
                userData: { minimum: -1, maximum: 10 }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.KoloFortunyNorbiego),
                userData: { minimum: 0, maximum: Infinity }
            }
        ],
        [
            {
                setPlayId: catalogId(SetPlayEnumType.KoloFortunyNorbiego),
                userData: { minimum: 0, maximum: '10' }
            }
        ]
    ];
    for (const input of invalid) {
        await expect(
            SetPlaysDataModel.saveSetPlays(
                lineupId,
                input as SetPlaySelectionType[]
            )
        ).rejects.toThrow();
    }
    expect(await getStoredSetPlays(lineupId)).toEqual(saved);
});

test('uses independent draft pools, accepting missing and null assignments', async () => {
    // A Gabbana draft does not exclude the player from the Dolce market pool.
    await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
            userData: { playerId: otherPoolPlayerId }
        }
    ]);
    await PlayersModel.updateOne(
        { _id: marketPlayerId },
        { $set: { dolceUserId: null, gabbanaUserId: null } }
    ).exec();
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
            userData: { playerId: marketPlayerId }
        }
    ]);
    expect(saved[0]).toHaveProperty('userData', { playerId: marketPlayerId });
    await SetPlaysDataModel.saveSetPlays(opponentLineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
            userData: { playerId: ownPlayerIds[0] }
        }
    ]);
    await expect(
        SetPlaysDataModel.saveSetPlays(opponentLineupId, [
            {
                setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
                userData: { playerId: opponentPlayerIds[0] }
            }
        ])
    ).rejects.toThrow();
    await SetPlaysDataModel.saveSetPlays(opponentLineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: opponentPlayerIds[5] }
        }
    ]);
    await expect(
        SetPlaysDataModel.saveSetPlays(opponentLineupId, [
            {
                setPlayId: catalogId(SetPlayEnumType.Rezerwa),
                userData: { playerId: ownPlayerIds[0] }
            }
        ])
    ).rejects.toThrow();
});

test('resolves the opponent from the schedule and requires the appropriate opponent data', async () => {
    await StartingLineupModel.deleteOne({ _id: opponentLineupId }).exec();
    await expect(
        SetPlaysDataModel.saveSetPlays(lineupId, [
            {
                setPlayId: catalogId(SetPlayEnumType.Typer),
                userData: {
                    playerId: ownPlayerIds[0],
                    attemptOne: {
                        heatOne: 0,
                        heatTwo: 1,
                        heatThree: 2,
                        heatFour: 3
                    },
                    attemptTwo: {
                        heatOne: 3,
                        heatTwo: 2,
                        heatThree: 1,
                        heatFour: 0
                    }
                }
            }
        ])
    ).rejects.toThrow('Opponent starting lineup not found');
    // Avatar needs the opponent squad, but not their submitted starting lineup.
    await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.Awatar),
            userData: { playerId: ownPlayerIds[5] }
        }
    ]);
    await ScheduleModel.deleteMany().exec();
    await expect(
        SetPlaysDataModel.saveSetPlays(lineupId, [
            {
                setPlayId: catalogId(SetPlayEnumType.Awatar),
                userData: { playerId: marketPlayerId }
            }
        ])
    ).rejects.toThrow('Scheduled opponent not found');
    await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.RyszardKowalski),
            userData: { playerId: ownPlayerIds[0] }
        }
    ]);
});

test('counts repetitions independently of players and resets the six-play allowance each round', async () => {
    const six: SetPlaySelectionType[] = [
        {
            setPlayId: catalogId(SetPlayEnumType.GwarancjaStartow),
            userData: { playerId: ownPlayerIds[0] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.GwarancjaStartow),
            userData: { playerId: ownPlayerIds[0] }
        },
        { setPlayId: catalogId(SetPlayEnumType.Ncd) },
        { setPlayId: catalogId(SetPlayEnumType.Ncd) },
        { setPlayId: catalogId(SetPlayEnumType.Ncd6) },
        { setPlayId: catalogId(SetPlayEnumType.Ncd6) }
    ];
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, six);
    await expect(
        SetPlaysDataModel.saveSetPlays(lineupId, [
            six[0],
            six[1],
            {
                setPlayId: catalogId(SetPlayEnumType.GwarancjaStartow),
                userData: { playerId: ownPlayerIds[1] }
            }
        ])
    ).rejects.toThrow();
    const nextLineup = await createLineup(ownUserId, ownPlayerIds, 3);
    expect(
        await SetPlaysDataModel.saveSetPlays(nextLineup._id.toString(), six)
    ).toHaveLength(6);
    expect(await getStoredSetPlays(lineupId)).toEqual(saved);
    await SetPlaysDataModel.saveSetPlays(lineupId, []);
    await expect(
        SetPlaysDataModel.saveSetPlays(nextLineup._id.toString(), [
            ...six,
            { setPlayId: catalogId(SetPlayEnumType.Remis) }
        ])
    ).rejects.toThrow();
});

test('rejects Spartacus in round one using the lineup round', async () => {
    const firstLineup = await createLineup(ownUserId, ownPlayerIds, 1);
    await ScheduleModel.create({
        userOneId: ownUserId,
        userTwoId: opponentUserId,
        roundNumber: 1
    });
    await expect(
        SetPlaysDataModel.saveSetPlays(firstLineup._id.toString(), [
            {
                setPlayId: catalogId(SetPlayEnumType.Spartacus),
                userData: {
                    ownPlayerId: ownPlayerIds[0],
                    opponentPlayerId: opponentPlayerIds[0]
                }
            }
        ])
    ).rejects.toThrow('Spartacus is available from round two');
    expect(await getStoredSetPlays(firstLineup._id.toString())).toEqual([]);
});

test('persists each admin result shape including explicit false and fractional averages', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) },
        { setPlayId: catalogId(SetPlayEnumType.Ncd) },
        { setPlayId: catalogId(SetPlayEnumType.Ncd6) },
        {
            setPlayId: catalogId(SetPlayEnumType.Spartacus),
            userData: {
                ownPlayerId: ownPlayerIds[0],
                opponentPlayerId: opponentPlayerIds[0]
            }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
            userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.Awatar),
            userData: { playerId: marketPlayerId }
        }
    ]);
    const results = [
        { playerIdList: [ownPlayerIds[0]] },
        { playerIdList: ownPlayerIds.slice(0, 4) },
        { playerIdList: opponentPlayerIds.slice(0, 4) },
        { ownAverage: 2.25, opponentAverage: 1.75 },
        {
            leaders: ownPlayerIds.slice(0, 4).map((playerId, index) => {
                return {
                    playerId,
                    scoredMore: index === 1
                };
            })
        },
        { heatOne: 0, heatSeven: 2 }
    ];
    for (let index = 0; index < saved.length; index++) {
        await SetPlaysDataModel.saveSetPlayResults(
            lineupId,
            saved[index].playId,
            results[index]
        );
    }
    expect(await getStoredSetPlays(lineupId)).toEqual(
        saved.map((play, index) => {
            return {
                ...play,
                adminData:
                    index === 5
                        ? {
                              heatOne: 0,
                              heatTwo: 0,
                              heatThree: 0,
                              heatFour: 0,
                              heatFive: 0,
                              heatSix: 0,
                              heatSeven: 2
                          }
                        : results[index]
            };
        })
    );
});

test('defaults omitted Brudna Pala result checkboxes to false', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
            userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
        }
    ]);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
        leaders: [
            { playerId: ownPlayerIds[0] },
            { playerId: ownPlayerIds[1], scoredMore: true },
            { playerId: ownPlayerIds[2], scoredMore: false },
            { playerId: ownPlayerIds[3] }
        ]
    });
    const plays = await getStoredSetPlays(lineupId);
    expect(plays[0]).toHaveProperty('adminData', {
        leaders: ownPlayerIds.slice(0, 4).map((playerId, index) => {
            return {
                playerId,
                scoredMore: index === 1
            };
        })
    });
});

test('defaults market reserve heats to zero before admin results are submitted', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.RezerwaGielda),
            userData: { playerId: marketPlayerId }
        }
    ]);
    expect(saved[0]).toHaveProperty('adminData', DEFAULT_PLAYER_SCORE_DETAILS);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {});
    expect((await getStoredSetPlays(lineupId))[0]).toEqual({
        ...saved[0],
        adminData: {
            heatOne: 0,
            heatTwo: 0,
            heatThree: 0,
            heatFour: 0,
            heatFive: 0,
            heatSix: 0,
            heatSeven: 0
        }
    });
});

test('rejects incomplete, foreign and malformed admin results without losing valid results', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) },
        { setPlayId: catalogId(SetPlayEnumType.Ncd) },
        { setPlayId: catalogId(SetPlayEnumType.Ncd6) },
        {
            setPlayId: catalogId(SetPlayEnumType.Spartacus),
            userData: {
                ownPlayerId: ownPlayerIds[0],
                opponentPlayerId: opponentPlayerIds[0]
            }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.BrudnaPala),
            userData: { leaderIdList: ownPlayerIds.slice(0, 4) }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[5] }
        }
    ]);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
        playerIdList: []
    });
    const before = await getStoredSetPlays(lineupId);
    const leaders = ownPlayerIds
        .slice(0, 4)
        .map(playerId => ({ playerId, scoredMore: false }));
    const invalid: [number, unknown][] = [
        [0, {}],
        [0, { playerIdList: [opponentPlayerIds[0]] }],
        [0, { playerIdList: [ownPlayerIds[0], ownPlayerIds[0]] }],
        [1, { playerIdList: ownPlayerIds.slice(0, 3) }],
        [
            1,
            {
                playerIdList: [
                    ownPlayerIds[0],
                    ownPlayerIds[0],
                    ownPlayerIds[1],
                    ownPlayerIds[2]
                ]
            }
        ],
        [
            1,
            {
                playerIdList: [
                    ...ownPlayerIds.slice(0, 3),
                    new mongoose.Types.ObjectId().toString()
                ]
            }
        ],
        [2, { playerIdList: ownPlayerIds.slice(0, 3) }],
        [3, { ownAverage: 2 }],
        [3, { ownAverage: -1, opponentAverage: 2 }],
        [4, { leaders: leaders.slice(0, 3) }],
        [4, { leaders: [leaders[0], leaders[0], leaders[1], leaders[2]] }],
        [
            4,
            {
                leaders: [
                    ...leaders.slice(0, 3),
                    { playerId: marketPlayerId, scoredMore: true }
                ]
            }
        ],
        [
            4,
            {
                leaders: [
                    ...leaders.slice(0, 3),
                    { playerId: ownPlayerIds[3], scoredMore: 'yes' }
                ]
            }
        ],
        [5, { heatOne: -1 }],
        [5, { heatOne: 101 }],
        [5, { heatOne: NaN }],
        [5, { heatOne: '3' }]
    ];
    for (const [index, input] of invalid) {
        await expect(
            SetPlaysDataModel.saveSetPlayResults(
                lineupId,
                saved[index].playId,
                input as SetPlayAdminInputType
            )
        ).rejects.toThrow();
    }
    expect(await getStoredSetPlays(lineupId)).toEqual(before);
});

test('rejects results for every type without admin inputs', async () => {
    const selections: SetPlaySelectionType[] = [
        {
            setPlayId: catalogId(SetPlayEnumType.GwarancjaStartow),
            userData: { playerId: ownPlayerIds[0] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.MortalKombatCombo)
        },
        { setPlayId: catalogId(SetPlayEnumType.Muchomor) },
        { setPlayId: catalogId(SetPlayEnumType.PijanyCieslak) },
        { setPlayId: catalogId(SetPlayEnumType.PauloSousa) },
        {
            setPlayId: catalogId(SetPlayEnumType.RyszardKowalski),
            userData: { playerId: ownPlayerIds[0] }
        },
        {
            setPlayId: catalogId(SetPlayEnumType.Typer),
            userData: {
                playerId: ownPlayerIds[0],
                attemptOne: {
                    heatOne: 3,
                    heatTwo: 0,
                    heatThree: 1,
                    heatFour: 2
                },
                attemptTwo: {
                    heatOne: 0,
                    heatTwo: 3,
                    heatThree: 2,
                    heatFour: 1
                }
            }
        },
        { setPlayId: catalogId(SetPlayEnumType.Taktyczna) },
        {
            setPlayId: catalogId(SetPlayEnumType.KoloFortunyNorbiego),
            userData: { minimum: 10.5, maximum: 10.5 }
        }
    ];
    for (const selection of selections) {
        const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
            selection
        ]);
        await expect(
            SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {})
        ).rejects.toThrow();
        expect(await getStoredSetPlays(lineupId)).toEqual(saved);
    }
});

test('targets one of two identical-type plays without changing the other results', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) },
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    expect(saved[0].playId).not.toBe(saved[1].playId);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
        playerIdList: [ownPlayerIds[0]]
    });
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[1].playId, {
        playerIdList: []
    });
    expect(await getStoredSetPlays(lineupId)).toEqual([
        { ...saved[0], adminData: { playerIdList: [ownPlayerIds[0]] } },
        { ...saved[1], adminData: { playerIdList: [] } }
    ]);
});

test('rejects duplicate, unknown, removed and foreign-lineup play identities', async () => {
    const own = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    const foreign = await SetPlaysDataModel.saveSetPlays(opponentLineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    const ids = [
        'invalid',
        new mongoose.Types.ObjectId().toString(),
        foreign[0].playId
    ];
    for (const id of ids) {
        await expect(
            SetPlaysDataModel.updateSetPlay(lineupId, id, {
                setPlayId: catalogId(SetPlayEnumType.Muchomor)
            })
        ).rejects.toThrow();
        await expect(
            SetPlaysDataModel.removeSetPlay(lineupId, id)
        ).rejects.toThrow();
        await expect(
            SetPlaysDataModel.saveSetPlayResults(lineupId, id, {
                playerIdList: []
            })
        ).rejects.toThrow();
        await expect(
            SetPlaysDataModel.saveSetPlays(lineupId, [
                { playId: id, setPlayId: catalogId(SetPlayEnumType.Remis) }
            ])
        ).rejects.toThrow();
    }
    await expect(
        SetPlaysDataModel.saveSetPlays(lineupId, [
            { playId: own[0].playId, setPlayId: own[0].setPlayId },
            { playId: own[0].playId, setPlayId: own[0].setPlayId }
        ])
    ).rejects.toThrow('Duplicate playId');
    expect(await getStoredSetPlays(lineupId)).toEqual(own);
    expect(await getStoredSetPlays(opponentLineupId)).toEqual(foreign);
    await SetPlaysDataModel.removeSetPlay(lineupId, own[0].playId);
    await expect(
        SetPlaysDataModel.updateSetPlay(lineupId, own[0].playId, {
            setPlayId: catalogId(SetPlayEnumType.Muchomor)
        })
    ).rejects.toThrow();
    await expect(
        SetPlaysDataModel.saveSetPlays(lineupId, [
            { playId: own[0].playId, setPlayId: own[0].setPlayId }
        ])
    ).rejects.toThrow('Invalid playId');
});

test('individual edits enforce occurrence limits and reject admin-data injection', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[5] }
        },
        { setPlayId: catalogId(SetPlayEnumType.Muchomor) },
        { setPlayId: catalogId(SetPlayEnumType.Muchomor) },
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[3].playId, {
        playerIdList: []
    });
    const before = await getStoredSetPlays(lineupId);
    await expect(
        SetPlaysDataModel.updateSetPlay(lineupId, saved[3].playId, {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[0] }
        })
    ).rejects.toThrow();
    await expect(
        SetPlaysDataModel.updateSetPlay(lineupId, saved[3].playId, {
            setPlayId: catalogId(SetPlayEnumType.Muchomor)
        })
    ).rejects.toThrow();
    const injected = {
        setPlayId: catalogId(SetPlayEnumType.Remis),
        adminData: { playerIdList: [ownPlayerIds[0]] }
    };
    await expect(
        SetPlaysDataModel.updateSetPlay(
            lineupId,
            saved[3].playId,
            injected as SetPlayUpdateType
        )
    ).rejects.toThrow();
    expect(await getStoredSetPlays(lineupId)).toEqual(before);
});

test('batch edits clear changed results and remove omitted plays', async () => {
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[5] }
        },
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
        heatOne: 3
    });
    const changed = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            playId: saved[0].playId,
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[0] }
        }
    ]);
    expect(changed).toEqual([
        {
            playId: saved[0].playId,
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            type: SetPlayEnumType.Rezerwa,
            name: 'Rezerwa',
            userData: { playerId: ownPlayerIds[0] },
            adminData: DEFAULT_PLAYER_SCORE_DETAILS
        }
    ]);
    await expect(
        SetPlaysDataModel.saveSetPlayResults(lineupId, saved[1].playId, {
            playerIdList: []
        })
    ).rejects.toThrow();
    const replacement = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { playId: saved[0].playId, setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    expect(replacement[0].playId).not.toBe(saved[0].playId);
    expect(await getStoredSetPlays(lineupId)).toEqual(replacement);
});

test('rejects missing lineups on writes and allows a removed play to be replaced', async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    await expect(
        SetPlaysDataModel.getSetPlaysForUser('bad-id')
    ).rejects.toThrow();
    expect(await SetPlaysDataModel.getSetPlaysForUser(missing)).toEqual([]);
    for (const id of ['bad-id', missing]) {
        await expect(SetPlaysDataModel.saveSetPlays(id, [])).rejects.toThrow();
    }
    expect(await getStoredSetPlays(lineupId)).toEqual([]);
    await expect(
        SetPlaysDataModel.removeSetPlay(lineupId, missing)
    ).rejects.toThrow();
    await expect(
        SetPlaysDataModel.updateSetPlay(lineupId, missing, {
            setPlayId: catalogId(SetPlayEnumType.Remis)
        })
    ).rejects.toThrow();
    await expect(
        SetPlaysDataModel.saveSetPlayResults(lineupId, missing, {})
    ).rejects.toThrow();
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[5] }
        }
    ]);
    await SetPlaysDataModel.removeSetPlay(lineupId, saved[0].playId);
    const replacement = await SetPlaysDataModel.saveSetPlays(lineupId, [
        {
            setPlayId: catalogId(SetPlayEnumType.Rezerwa),
            userData: { playerId: ownPlayerIds[0] }
        }
    ]);
    expect(replacement[0].playId).not.toBe(saved[0].playId);
});

test('simultaneous initial saves cannot create duplicate lineup documents', async () => {
    const attempts = await Promise.allSettled([
        SetPlaysDataModel.saveSetPlays(lineupId, [
            { setPlayId: catalogId(SetPlayEnumType.Remis) }
        ]),
        SetPlaysDataModel.saveSetPlays(lineupId, [
            { setPlayId: catalogId(SetPlayEnumType.Muchomor) }
        ])
    ]);
    expect(attempts.some(attempt => attempt.status === 'fulfilled')).toBe(true);
    expect(
        await SetPlaysDataModel.countDocuments({ startingLineupId: lineupId })
    ).toBe(1);
    expect(await getStoredSetPlays(lineupId)).toHaveLength(1);
});

test('rejects catalog metadata and selection changes through actor operations', async () => {
    const selection = { setPlayId: catalogId(SetPlayEnumType.Remis) };
    const [saved] = await SetPlaysDataModel.saveSetPlays(lineupId, [selection]);
    const results = { playerIdList: [ownPlayerIds[0]] };
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved.playId, results);
    for (const field of [
        { name: 'Forged name' },
        { type: SetPlayEnumType.Muchomor },
        { adminData: results }
    ]) {
        await expect(
            SetPlaysDataModel.saveSetPlays(lineupId, [
                { ...selection, ...field }
            ])
        ).rejects.toThrow();
        await expect(
            SetPlaysDataModel.updateSetPlay(lineupId, saved.playId, {
                ...selection,
                ...field
            })
        ).rejects.toThrow();
    }
    for (const field of [
        { setPlayId: catalogId(SetPlayEnumType.Muchomor) },
        { userData: { playerId: marketPlayerId } },
        { type: SetPlayEnumType.Muchomor },
        { name: 'Forged name' }
    ]) {
        await expect(
            SetPlaysDataModel.saveSetPlayResults(lineupId, saved.playId, {
                ...results,
                ...field
            })
        ).rejects.toThrow();
    }
    expect(await SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)).toEqual([
        { name: 'Remis', adminData: results }
    ]);
});

test('rejects missing, malformed and unknown catalog references without partial writes', async () => {
    const selection = { setPlayId: catalogId(SetPlayEnumType.Remis) };
    const [saved] = await SetPlaysDataModel.saveSetPlays(lineupId, [selection]);
    for (const setPlayId of [
        undefined,
        'bad-id',
        new mongoose.Types.ObjectId().toString()
    ]) {
        const invalid = { setPlayId } as SetPlaySelectionType;
        await expect(
            SetPlaysDataModel.saveSetPlays(lineupId, [selection, invalid])
        ).rejects.toThrow();
        await expect(
            SetPlaysDataModel.updateSetPlay(lineupId, saved.playId, invalid)
        ).rejects.toThrow();
    }
    await expect(
        SetPlaysDataModel.create({
            startingLineupId: opponentLineupId,
            setPlayList: [{}]
        })
    ).rejects.toThrow();
    expect(await getStoredSetPlays(lineupId)).toEqual([saved]);
    expect(
        await SetPlaysDataModel.getSetPlaysForUser(opponentLineupId)
    ).toEqual([]);
});

test('counts catalog aliases by type and replaces a purchase when its catalog reference changes', async () => {
    const [second, third] = await SetPlaysModel.create([
        { name: 'Second draw play', type: SetPlayEnumType.Remis },
        { name: 'Third draw play', type: SetPlayEnumType.Remis }
    ]);
    const firstSelection = { setPlayId: catalogId(SetPlayEnumType.Remis) };
    const secondSelection = { setPlayId: second._id.toString() };
    const thirdSelection = { setPlayId: third._id.toString() };
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [
        firstSelection,
        secondSelection
    ]);
    await expect(
        SetPlaysDataModel.saveSetPlays(lineupId, [
            firstSelection,
            secondSelection,
            thirdSelection
        ])
    ).rejects.toThrow('may be selected at most 2');
    await SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
        playerIdList: []
    });
    const evaluated = await SetPlaysDataModel.saveSetPlayResults(
        lineupId,
        saved[1].playId,
        {
            playerIdList: [ownPlayerIds[0]]
        }
    );
    const replaced = await SetPlaysDataModel.updateSetPlay(
        lineupId,
        saved[0].playId,
        thirdSelection
    );
    expect(replaced[0]).toEqual({
        playId: expect.any(String),
        setPlayId: third._id.toString(),
        name: 'Third draw play',
        type: SetPlayEnumType.Remis
    });
    expect(replaced[0].playId).not.toBe(saved[0].playId);
    expect(replaced[1]).toEqual(evaluated[1]);
    await expect(
        SetPlaysDataModel.saveSetPlayResults(lineupId, saved[0].playId, {
            playerIdList: []
        })
    ).rejects.toThrow('Invalid playId');
});

test('reports dangling catalog references instead of hiding purchases', async () => {
    const [saved] = await SetPlaysDataModel.saveSetPlays(lineupId, [
        { setPlayId: catalogId(SetPlayEnumType.Remis) }
    ]);
    const stored = await SetPlaysDataModel.collection.findOne({
        startingLineupId: new mongoose.Types.ObjectId(lineupId)
    });
    await SetPlaysModel.deleteOne({ _id: saved.setPlayId }).exec();
    await expect(
        SetPlaysDataModel.getSetPlaysForUser(lineupId)
    ).rejects.toThrow('Missing catalog entry');
    await expect(
        SetPlaysDataModel.getSetPlaysForAdmin(2, ownUserId)
    ).rejects.toThrow('Missing catalog entry');
    await expect(
        SetPlaysDataModel.saveSetPlayResults(lineupId, saved.playId, {
            playerIdList: []
        })
    ).rejects.toThrow('Missing catalog entry');
    expect(
        await SetPlaysDataModel.collection.findOne({ _id: stored?._id })
    ).toEqual(stored);
});

test('ignores unrelated unknown fields in selections, results and Mongoose documents', async () => {
    const selection = {
        setPlayId: catalogId(SetPlayEnumType.Spartacus),
        opponentId: new mongoose.Types.ObjectId().toString(),
        userData: {
            ownPlayerId: ownPlayerIds[0],
            opponentPlayerId: opponentPlayerIds[0],
            extra: true
        }
    } as const;
    const saved = await SetPlaysDataModel.saveSetPlays(lineupId, [selection]);
    expect(saved[0]).toHaveProperty('userData', {
        ownPlayerId: ownPlayerIds[0],
        opponentPlayerId: opponentPlayerIds[0]
    });
    expect(saved[0]).not.toHaveProperty('opponentId');
    const results = {
        ownAverage: 2,
        opponentAverage: 1,
        checkbox: true
    };
    const updated = await SetPlaysDataModel.saveSetPlayResults(
        lineupId,
        saved[0].playId,
        results
    );
    expect(updated[0]).toHaveProperty('adminData', {
        ownAverage: 2,
        opponentAverage: 1
    });
    const document = await SetPlaysDataModel.findOne({
        startingLineupId: lineupId
    }).exec();
    if (!document) {
        throw new Error('Missing set-play document');
    }
    document.set('extra', true);
    document.set('setPlayList.0.userData.extra', true);
    document.set('setPlayList.0.adminData.extra', true);
    await document.save();
    const persisted = await SetPlaysDataModel.findById(document._id)
        .lean()
        .exec();
    expect(persisted).not.toHaveProperty('extra');
    expect(persisted?.setPlayList[0]).not.toHaveProperty('userData.extra');
    expect(persisted?.setPlayList[0]).toHaveProperty('adminData', {
        ownAverage: 2,
        opponentAverage: 1
    });
});
