import { SetPlayEnumType } from '@/db/models/schema.types';
import { formatSetPlaysComment } from '@/utils/utils';

const players = [
    { playerId: 'one', extraligaPlayerName: 'Bartosz Zmarzlik' },
    { playerId: 'two', extraligaPlayerName: 'Andrzej Lebiediew' },
    { playerId: 'three', extraligaPlayerName: 'Robert Lambert' },
    { playerId: 'reserve', extraligaPlayerName: 'Mathias Pollestad' },
    { playerId: 'market', extraligaPlayerName: 'Kevin Małkiewicz' },
    { playerId: 'opponent', extraligaPlayerName: 'Jan Kvěch Nowak' }
];

describe('formatSetPlaysComment', () => {
    test('Should format roles and selected player details in saved order without merging repeated selections', () => {
        const descriptions = formatSetPlaysComment({
            roles: { p: 'three', pn: 'one', kb: 'two' },
            players,
            setPlays: [
                {
                    name: 'Gwarancja startów',
                    type: SetPlayEnumType.GwarancjaStartow,
                    userData: { playerId: 'reserve' }
                },
                {
                    name: 'Rezerwa',
                    type: SetPlayEnumType.Rezerwa,
                    userData: { playerId: 'reserve' }
                },
                {
                    name: 'Rezerwa Giełda',
                    type: SetPlayEnumType.RezerwaGielda,
                    userData: { playerId: 'market' }
                },
                {
                    name: 'Ryszard Kowalski',
                    type: SetPlayEnumType.RyszardKowalski,
                    userData: { playerId: 'one' }
                },
                {
                    name: 'NCD',
                    type: SetPlayEnumType.Ncd,
                    userData: { playerId: 'one' }
                },
                {
                    name: 'NCD6',
                    type: SetPlayEnumType.Ncd6,
                    userData: { playerId: 'two' }
                },
                {
                    name: 'Awatar',
                    type: SetPlayEnumType.Awatar,
                    userData: {
                        playerId: 'market',
                        replacedPlayerId: 'three'
                    }
                },
                {
                    name: 'Spartacus',
                    type: SetPlayEnumType.Spartacus,
                    userData: {
                        ownPlayerId: 'one',
                        opponentPlayerId: 'opponent'
                    }
                },
                {
                    name: 'Brudna Pała',
                    type: SetPlayEnumType.BrudnaPala,
                    userData: {
                        leaderIdList: ['one', 'three', 'two', 'opponent']
                    }
                },
                {
                    name: 'Typer',
                    type: SetPlayEnumType.Typer,
                    userData: {
                        playerId: 'one',
                        attemptOne: {
                            heatOne: 3,
                            heatTwo: 2,
                            heatThree: 1,
                            heatFour: 0
                        },
                        attemptTwo: {
                            heatOne: 2,
                            heatTwo: 3,
                            heatThree: 1,
                            heatFour: 2
                        }
                    }
                },
                {
                    name: 'Koło Fortuny Norbiego',
                    type: SetPlayEnumType.KoloFortunyNorbiego,
                    userData: { minimum: 0, maximum: 12 }
                },
                {
                    name: 'Gwarancja startów',
                    type: SetPlayEnumType.GwarancjaStartow,
                    userData: { playerId: 'reserve' }
                }
            ]
        });

        expect(descriptions).toBe(
            'PN - Bartosz Zmarzlik, KB - Andrzej Lebiediew, P - Robert Lambert, GS: Mathias Pollestad, Rezerwa: Mathias Pollestad, Rezerwa Giełda: Kevin Małkiewicz, Ryszard Kowalski: Bartosz Zmarzlik, NCD: Bartosz Zmarzlik, NCD6: Andrzej Lebiediew, Awatar: Kevin Małkiewicz za Robert Lambert, Spartacus: Bartosz Zmarzlik vs Jan Kvěch Nowak, Brudna Pała: Bartosz Zmarzlik, Robert Lambert, Andrzej Lebiediew, Jan Kvěch Nowak, Typer: Bartosz Zmarzlik 6/8, KFN: 0–12, GS: Mathias Pollestad'
        );
    });

    test('Should preserve stored labels for plays without additional user choices', () => {
        const descriptions = formatSetPlaysComment({
            roles: null,
            players: [],
            setPlays: [
                { name: 'Remis', type: SetPlayEnumType.Remis, userData: null },
                {
                    name: 'Mortal Kombat Combo',
                    type: SetPlayEnumType.MortalKombatCombo,
                    userData: null
                },
                {
                    name: 'Muchomor – własna nazwa',
                    type: SetPlayEnumType.Muchomor,
                    userData: null
                },
                {
                    name: 'Pijany Cieślak',
                    type: SetPlayEnumType.PijanyCieslak,
                    userData: null
                },
                {
                    name: 'Paulo Sousa',
                    type: SetPlayEnumType.PauloSousa,
                    userData: null
                },
                {
                    name: 'Taktyczna',
                    type: SetPlayEnumType.Taktyczna,
                    userData: null
                }
            ]
        });

        expect(descriptions).toBe(
            'Remis:, Mortal Kombat Combo:, Muchomor – własna nazwa:, Pijany Cieślak:, Paulo Sousa:, Taktyczna:'
        );
    });

    test('Should return an empty summary without selections and keep roles when no plays are selected', () => {
        expect(formatSetPlaysComment({ setPlays: [], players: [] })).toBe('');
        expect(
            formatSetPlaysComment({
                roles: { p: 'three', pn: 'one', kb: 'two' },
                players,
                setPlays: []
            })
        ).toBe(
            'PN - Bartosz Zmarzlik, KB - Andrzej Lebiediew, P - Robert Lambert'
        );
    });
});
