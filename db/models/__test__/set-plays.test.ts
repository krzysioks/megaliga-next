import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import { SetPlayEnumType } from '@/db/models/schema.types';
import SetPlaysModel, {
    SetPlaysReturnType,
    SetPlaysType
} from '@/db/models/set-plays';

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

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await new DBClient().connect();
});

beforeEach(async () => {
    await SetPlaysModel.deleteMany();
});

afterAll(async () => {
    await SetPlaysModel.deleteMany();
    await mongoose.disconnect();
    jest.restoreAllMocks();
});

describe('Test SetPlaysModel methods and static functions', () => {
    describe('getSetPlays', () => {
        test('Should throw error if no set plays fetched from db', async () => {
            await expect(SetPlaysModel.getSetPlays()).rejects.toThrow(
                'No set plays found'
            );
        });

        test('Should return all set plays supported by megaliga', async () => {
            const createdSetPlays =
                await SetPlaysModel.create(setPlaysToCreate);

            const setPlays: SetPlaysReturnType[] =
                await SetPlaysModel.getSetPlays();

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
    });
});
