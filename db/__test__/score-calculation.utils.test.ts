import type {
    CalculationPlayerType,
    CalculationTeamType
} from '@/db/db.types';

import { calculateMatchScores } from '@/db/score-calculation.utils';

function createPlayer(values: Array<number | null>): CalculationPlayerType {
    const heat = (value: number | null) => {
        return { value, bonus: false, isNominated: false };
    };
    return {
        playerId: '',
        isJunior: false,
        heatOne: heat(values[0] ?? null),
        heatTwo: heat(values[1] ?? null),
        heatThree: heat(values[2] ?? null),
        heatFour: heat(values[3] ?? null),
        heatFive: heat(values[4] ?? null),
        heatSix: heat(values[5] ?? null),
        heatSeven: heat(values[6] ?? null),
        setPlay: 99,
        comment: 'Previous calculation'
    };
}

function createTeam(): CalculationTeamType {
    const leader = { ...createPlayer([3, 3, 3, 3]), playerId: 'leader' };
    leader.heatFour.isNominated = true;
    const joker = { ...createPlayer([2, 3, 0]), playerId: 'joker' };
    joker.heatOne.bonus = true;
    joker.heatTwo.bonus = true;
    const captain = { ...createPlayer([3, 3, 2]), playerId: 'captain' };
    captain.heatTwo.bonus = true;
    captain.heatThree.isNominated = true;
    return {
        players: [
            leader,
            joker,
            captain,
            { ...createPlayer([1, 2, 3, 2]), playerId: 'four' },
            { ...createPlayer([1, 2, 3, 0, 4]), playerId: 'five' }
        ],
        startingLineup: {
            playerOne: 'leader',
            playerTwo: 'joker',
            playerThree: 'captain',
            playerFour: 'four',
            playerFive: 'five',
            roles: {
                pn: { playerId: 'leader', isDisabled: false },
                kb: 'joker',
                p: 'captain'
            }
        },
        setPlayList: []
    };
}

describe('calculateMatchScores', () => {
    test('Should reject missing starting lineup player scores', () => {
        const teamOne = createTeam();
        teamOne.players.pop();
        expect(() => {
            calculateMatchScores({ teamOne, teamTwo: createTeam() });
        }).toThrow('Missing score data for starting lineup player: five');
    });

    test('Should reject an assigned role outside the starting lineup', () => {
        const teamOne = createTeam();
        teamOne.startingLineup.roles.kb = 'reserve';
        expect(() => {
            calculateMatchScores({ teamOne, teamTwo: createTeam() });
        }).toThrow('Role player is not in starting lineup: reserve');
    });

    test('Should reject an unsaved heat rather than counting it as an unused submitted result', () => {
        const teamOne = createTeam();
        Reflect.deleteProperty(teamOne.players[0].heatOne, 'value');
        expect(() => {
            calculateMatchScores({ teamOne, teamTwo: createTeam() });
        }).toThrow('Missing heat data for player: leader');
    });

    test('Should reject a missing heat object', () => {
        const teamOne = createTeam();
        Reflect.deleteProperty(teamOne.players[0], 'heatOne');
        expect(() => {
            calculateMatchScores({ teamOne, teamTwo: createTeam() });
        }).toThrow('Missing heat data for player: leader');
    });

    test('Should calculate total scores for both teams with no selected set plays', () => {
        const teamOne = createTeam();
        const teamTwo = createTeam();
        teamTwo.players[2].heatThree.value = 1;
        const before = structuredClone({ teamOne, teamTwo });
        const result = calculateMatchScores({ teamOne, teamTwo });

        expect(result.teamOne.players.map(player => player.setPlay)).toEqual([
            5, 4, 6, 0, 0
        ]);
        expect(result.teamTwo.players.map(player => player.setPlay)).toEqual([
            5, 4, 2, 0, 0
        ]);
        expect(result.teamOne.players.map(player => player.comment)).toEqual([
            'Lider 2, PN 3',
            'Joker 2, KB 2',
            'Kapitan 4, P 2',
            '',
            ''
        ]);
        expect(result.teamOne.trainer).toEqual({
            heatOne: 3,
            heatTwo: 3,
            heatThree: 2,
            heatFour: 2,
            heatFive: 4,
            heatSix: 0,
            heatSeven: 0,
            setPlay: 0,
            comment: ''
        });
        expect(result.teamOneScore).toBe(72);
        expect(result.teamTwoScore).toBe(66);
        expect({ teamOne, teamTwo }).toEqual(before);
        expect(
            calculateMatchScores({
                teamOne: {
                    ...teamOne,
                    players: [...teamOne.players].reverse()
                },
                teamTwo
            })
        ).toEqual(result);
        expect(calculateMatchScores({ teamOne, teamTwo })).toEqual(result);
    });

    test('Should apply the confirmed Lider thresholds without adding bonuses twice', () => {
        const points = [10, 11, 12, 13, 14, 15, 16].map(total => {
            const teamOne = createTeam();
            teamOne.startingLineup.roles.pn.isDisabled = true;
            teamOne.players[0] = {
                ...createPlayer([
                    3,
                    3,
                    3,
                    Math.min(3, total - 9),
                    Math.max(0, total - 12)
                ]),
                playerId: 'leader'
            };
            teamOne.players[0].heatOne.bonus = true;
            return calculateMatchScores({ teamOne, teamTwo: createTeam() })
                .teamOne.players[0].setPlay;
        });
        expect(points).toEqual([0, 1, 2, 3, 4, 5, 5]);
    });

    test('Should disable only PN and include the final non-nominated bonus only for a junior P rider', () => {
        const teamOne = createTeam();
        teamOne.startingLineup.roles.pn.isDisabled = true;
        teamOne.players[2].isJunior = true;
        const result = calculateMatchScores({ teamOne, teamTwo: createTeam() });
        expect(result.teamOne.players.map(player => player.setPlay)).toEqual([
            2, 4, 3, 0, 0
        ]);
        expect(result.teamOne.players[0].comment).toBe(
            'Lider 2, PN 0 (pominięty)'
        );
        expect(result.teamOne.players[2].comment).toBe('Kapitan 0, P 3');
        expect(result.teamTwo.players[2].comment).toBe('Kapitan 0, P 2');
        teamOne.startingLineup.roles.pn.isDisabled = false;
        expect(
            calculateMatchScores({ teamOne, teamTwo: createTeam() }).teamOne
                .players[0].setPlay
        ).toBe(5);
    });

    test('Should count an entered last zero while skipping unused heats for Joker and P', () => {
        const teamOne = createTeam();
        teamOne.players[2].heatFour.value = 0;
        const result = calculateMatchScores({ teamOne, teamTwo: createTeam() });
        expect(result.teamOne.players[1].comment).toBe('Joker 2, KB 2');
        expect(result.teamOne.players[2].comment).toBe('Kapitan 0, P 0');
    });

    test('Should award zero for submitted riders with no starts and keep every trainer heat numeric', () => {
        const teamOne = createTeam();
        teamOne.players = teamOne.players.map(player => {
            return { ...createPlayer([]), playerId: player.playerId };
        });
        const result = calculateMatchScores({ teamOne, teamTwo: teamOne });
        expect(result.teamOne.players.map(player => player.setPlay)).toEqual([
            0, 0, 0, 0, 0
        ]);
        expect(result.teamOne.players.map(player => player.comment)).toEqual([
            'Lider 0, PN 0',
            'Joker 0, KB 0',
            'Kapitan 0, P 0',
            '',
            ''
        ]);
        expect(result.teamOne.trainer).toEqual({
            heatOne: 0,
            heatTwo: 0,
            heatThree: 0,
            heatFour: 0,
            heatFive: 0,
            heatSix: 0,
            heatSeven: 0,
            setPlay: 0,
            comment: ''
        });
        expect(result.teamOneScore).toBe(0);
        expect(result.teamTwoScore).toBe(0);
    });

    test.each([
        { values: [null, 2, 3], comment: 'Joker 5, KB 0' },
        { values: [null, null, 4], comment: 'Joker 8, KB 0' }
    ])(
        'Should use the first and last actual starts for Joker $values, counting a single start as both',
        ({ values, comment }) => {
            const teamOne = createTeam();
            teamOne.players[1] = { ...createPlayer(values), playerId: 'joker' };
            const result = calculateMatchScores({
                teamOne,
                teamTwo: createTeam()
            });
            expect(result.teamOne.players[1].comment).toBe(comment);
        }
    );

    test("Should compare Kapitan heat totals without the opponent's awards", () => {
        const teamTwo = createTeam();
        teamTwo.players[2].heatThree.value = 3;
        const result = calculateMatchScores({ teamOne: createTeam(), teamTwo });
        expect(result.teamOne.players[2].comment).toBe('Kapitan 0, P 2');
        expect(result.teamTwo.players[2].comment).toBe('Kapitan 4, P 2');
    });

    test('Should sum every nominated PN start including its bonus', () => {
        const teamOne = createTeam();
        teamOne.players[0].heatFive = {
            value: 2,
            bonus: true,
            isNominated: true
        };
        const result = calculateMatchScores({ teamOne, teamTwo: createTeam() });
        expect(result.teamOne.players[0].comment).toBe('Lider 4, PN 5');
    });

    test('Should count KB bonuses from nominated starts and ignore bonus flags on unused heats', () => {
        const teamOne = createTeam();
        teamOne.players[1].heatFour = {
            value: 3,
            bonus: true,
            isNominated: true
        };
        teamOne.players[1].heatFive.bonus = true;
        teamOne.players[1].heatSix.bonus = true;
        const result = calculateMatchScores({ teamOne, teamTwo: createTeam() });
        expect(result.teamOne.players[1].comment).toBe('Joker 5, KB 3');
    });
});
