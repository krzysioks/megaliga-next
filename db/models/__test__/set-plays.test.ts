import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import SetPlaysDataModel from '@/db/models/games/set-plays-data';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import { SetPlayEnumType } from '@/db/models/schema.types';
import SetPlaysModel, {
    SetPlaysReturnType,
    SetPlaysType
} from '@/db/models/set-plays';
import UserModel from '@/db/models/user';

const setPlayNames: Record<SetPlayEnumType, string> = {
    [SetPlayEnumType.GwarancjaStartow]: 'Gwarancja startów',
    [SetPlayEnumType.Remis]: 'Remis',
    [SetPlayEnumType.Rezerwa]: 'Rezerwa',
    [SetPlayEnumType.RezerwaGielda]: 'Rezerwa giełda',
    [SetPlayEnumType.MortalKombatCombo]: 'Mortal Kombat Combo',
    [SetPlayEnumType.Muchomor]: 'Muchomor',
    [SetPlayEnumType.Ncd]: 'NCD',
    [SetPlayEnumType.Ncd6]: 'NCD6',
    [SetPlayEnumType.Spartacus]: 'Spartacus',
    [SetPlayEnumType.PijanyCieslak]: 'Pijany Cieślak',
    [SetPlayEnumType.BrudnaPala]: 'Brudna pała',
    [SetPlayEnumType.PauloSousa]: 'Paulo Sousa',
    [SetPlayEnumType.RyszardKowalski]: 'Ryszard Kowalski',
    [SetPlayEnumType.Typer]: 'Typer',
    [SetPlayEnumType.Taktyczna]: 'Taktyczna',
    [SetPlayEnumType.Awatar]: 'Awatar',
    [SetPlayEnumType.KoloFortunyNorbiego]: 'Koło Fortuny Norbiego'
};

const setPlaysToCreate: SetPlaysType[] = Object.values(SetPlayEnumType).map(
    type => {
        return { name: setPlayNames[type], type };
    }
);

let userId: string;
let startingLineupId: string;
const lineupPlayers = {
    playerOne: new mongoose.Types.ObjectId().toString(),
    playerTwo: new mongoose.Types.ObjectId().toString(),
    playerThree: new mongoose.Types.ObjectId().toString(),
    playerFour: new mongoose.Types.ObjectId().toString(),
    playerFive: new mongoose.Types.ObjectId().toString()
};

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await new DBClient().connect();
});

beforeEach(async () => {
    await SetPlaysDataModel.deleteMany();
    await SetPlaysModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await UserModel.deleteMany();

    const user = await UserModel.create({
        username: 'set-play-user',
        coachName: 'Set Play Coach',
        email: 'set-play-user@example.com',
        password: 'Password1!',
        teamName: 'Set Play Team',
        logoUrl: 'https://example.com/logo.png'
    });
    userId = user._id.toString();
    const lineup = await StartingLineupModel.create({
        userId,
        roundNumber: 2,
        ...lineupPlayers
    });
    startingLineupId = lineup._id.toString();
});

afterAll(async () => {
    await SetPlaysDataModel.deleteMany();
    await SetPlaysModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
    jest.restoreAllMocks();
});

describe('Test SetPlaysModel methods and static functions', () => {
    describe('getAvailableSetPlays', () => {
        test.each([0, 15])(
            'Should throw error for regular-season round %i outside 1 - 14',
            async roundNumber => {
                await expect(
                    SetPlaysModel.getAvailableSetPlays(userId, roundNumber)
                ).rejects.toThrow(
                    `Invalid roundNumber: ${roundNumber}. Must be between 1 and 14`
                );
            }
        );

        test.each([1, 14])(
            'Should return available set plays for boundary round %i',
            async roundNumber => {
                const setPlay = await SetPlaysModel.create({
                    name: 'Remis',
                    type: SetPlayEnumType.Remis
                });
                await StartingLineupModel.create({
                    userId,
                    roundNumber,
                    ...lineupPlayers
                });

                expect(
                    await SetPlaysModel.getAvailableSetPlays(
                        userId,
                        roundNumber
                    )
                ).toEqual([
                    { id: setPlay._id, name: setPlay.name, type: setPlay.type }
                ]);
            }
        );

        test('Should throw error for a nonexistent user', async () => {
            const nonexistentUserId = new mongoose.Types.ObjectId().toString();

            await expect(
                SetPlaysModel.getAvailableSetPlays(nonexistentUserId, 2)
            ).rejects.toThrow(`Invalid userId: ${nonexistentUserId}`);
        });

        test('Should throw error if no set plays fetched from db', async () => {
            await expect(
                SetPlaysModel.getAvailableSetPlays(userId, 2)
            ).rejects.toThrow('No set plays found');
        });

        test('Should return all set plays supported by megaliga', async () => {
            const createdSetPlays =
                await SetPlaysModel.create(setPlaysToCreate);

            const setPlays: SetPlaysReturnType[] =
                await SetPlaysModel.getAvailableSetPlays(userId, 2);

            expect(setPlays).toHaveLength(
                Object.values(SetPlayEnumType).length
            );
            createdSetPlays.forEach(createdSetPlay => {
                const fetchedSetPlay = setPlays.find(
                    setPlay => setPlay.type === createdSetPlay.type
                );

                expect(fetchedSetPlay).toEqual({
                    id: createdSetPlay._id,
                    name: createdSetPlay.name,
                    type: createdSetPlay.type
                });
            });
        });

        test('Should return all set plays when the selections document is empty', async () => {
            await SetPlaysModel.create(setPlaysToCreate);
            await SetPlaysDataModel.create({ startingLineupId });

            const setPlays = await SetPlaysModel.getAvailableSetPlays(
                userId,
                2
            );

            expect(setPlays.map(setPlay => setPlay.type).sort()).toEqual(
                Object.values(SetPlayEnumType).sort()
            );
        });

        test('Should exclude types at their individual limits', async () => {
            const [draw, anotherDraw, reserve, marketReserve, mushroom] =
                await SetPlaysModel.create([
                    { name: 'Remis', type: SetPlayEnumType.Remis },
                    { name: 'Drugi remis', type: SetPlayEnumType.Remis },
                    { name: 'Rezerwa', type: SetPlayEnumType.Rezerwa },
                    {
                        name: 'Rezerwa giełda',
                        type: SetPlayEnumType.RezerwaGielda
                    },
                    { name: 'Muchomor', type: SetPlayEnumType.Muchomor }
                ]);
            const playerId = new mongoose.Types.ObjectId().toString();
            await SetPlaysDataModel.create({
                startingLineupId,
                setPlayList: [
                    { setPlayId: draw._id },
                    { setPlayId: anotherDraw._id },
                    { setPlayId: reserve._id, userData: { playerId } },
                    { setPlayId: marketReserve._id, userData: { playerId } },
                    { setPlayId: mushroom._id }
                ]
            });

            expect(await SetPlaysModel.getAvailableSetPlays(userId, 2)).toEqual(
                [{ id: mushroom._id, name: mushroom.name, type: mushroom.type }]
            );
        });

        test('Should return an empty list when six set plays have been selected', async () => {
            const catalog = await SetPlaysModel.create([
                { name: 'Remis', type: SetPlayEnumType.Remis },
                { name: 'Muchomor', type: SetPlayEnumType.Muchomor },
                { name: 'Taktyczna', type: SetPlayEnumType.Taktyczna }
            ]);
            await SetPlaysDataModel.create({
                startingLineupId,
                setPlayList: [...catalog, ...catalog].map(play => {
                    return { setPlayId: play._id };
                })
            });

            expect(await SetPlaysModel.getAvailableSetPlays(userId, 2)).toEqual(
                []
            );
        });

        test('Should throw error when the requested starting lineup does not exist', async () => {
            await SetPlaysModel.create(setPlaysToCreate);

            await expect(
                SetPlaysModel.getAvailableSetPlays(userId, 3)
            ).rejects.toThrow('Starting lineup not found');
        });
    });
});
