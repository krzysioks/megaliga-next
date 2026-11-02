import type { CalculationPlayerType, CalculationTeamType } from '@/db/db.types';

import { SetPlayEnumType } from '@/db/models/schema.types';
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

function createReplacementScores(values: Array<number | null>) {
    return { ...createPlayer(values), isMatchDraw: false };
}

function createTeam(playerIdPrefix = ''): CalculationTeamType {
    const leader = {
        ...createPlayer([3, 3, 3, 3]),
        playerId: `${playerIdPrefix}leader`
    };
    leader.heatFour.isNominated = true;
    const joker = {
        ...createPlayer([2, 3, 0]),
        playerId: `${playerIdPrefix}joker`
    };
    joker.heatOne.bonus = true;
    joker.heatTwo.bonus = true;
    const captain = {
        ...createPlayer([3, 3, 2]),
        playerId: `${playerIdPrefix}captain`
    };
    captain.heatTwo.bonus = true;
    captain.heatThree.isNominated = true;
    return {
        players: [
            leader,
            joker,
            captain,
            {
                ...createPlayer([1, 2, 3, 2]),
                playerId: `${playerIdPrefix}four`
            },
            {
                ...createPlayer([1, 2, 3, 0, 4]),
                playerId: `${playerIdPrefix}five`
            }
        ],
        startingLineup: {
            playerOne: `${playerIdPrefix}leader`,
            playerTwo: `${playerIdPrefix}joker`,
            playerThree: `${playerIdPrefix}captain`,
            playerFour: `${playerIdPrefix}four`,
            playerFive: `${playerIdPrefix}five`,
            roles: {
                pn: { playerId: `${playerIdPrefix}leader`, isDisabled: false },
                kb: `${playerIdPrefix}joker`,
                p: `${playerIdPrefix}captain`
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
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            });
        }).toThrow('Missing score data for starting lineup player: five');
    });

    test('Should reject an assigned role outside the starting lineup', () => {
        const teamOne = createTeam();
        teamOne.startingLineup.roles.kb = 'reserve';
        expect(() => {
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            });
        }).toThrow('Role player is not in starting lineup: reserve');
    });

    test('Should reject an unsaved heat rather than counting it as an unused submitted result', () => {
        const teamOne = createTeam();
        Reflect.deleteProperty(teamOne.players[0].heatOne, 'value');
        expect(() => {
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            });
        }).toThrow('Missing heat data for player: leader');
    });

    test('Should reject a missing heat object', () => {
        const teamOne = createTeam();
        Reflect.deleteProperty(teamOne.players[0], 'heatOne');
        expect(() => {
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            });
        }).toThrow('Missing heat data for player: leader');
    });

    test.each([
        { type: SetPlayEnumType.Remis, label: 'Remis' },
        { type: SetPlayEnumType.Ncd, label: 'NCD' },
        { type: SetPlayEnumType.Ncd6, label: 'NCD6' },
        { type: SetPlayEnumType.Spartacus, label: 'Spartacus' }
    ] as const)(
        'Should reject missing $label admin data',
        ({ type, label }) => {
            const teamOne = createTeam();
            const common = {
                selectedSetPlayId: 's',
                setPlayId: 's',
                name: label
            };
            if (type === SetPlayEnumType.Remis) {
                teamOne.setPlayList = [{ ...common, type }];
            } else if (type === SetPlayEnumType.Spartacus) {
                teamOne.setPlayList = [
                    {
                        ...common,
                        type,
                        userData: {
                            ownPlayerId: 'leader',
                            opponentPlayerId: 'joker'
                        }
                    }
                ];
            } else {
                teamOne.setPlayList = [
                    { ...common, type, userData: { playerId: 'leader' } }
                ];
            }
            expect(() =>
                calculateMatchScores({
                    roundNumber: 2,
                    teamOne,
                    teamTwo: createTeam()
                })
            ).toThrow(`${label} admin data is required for score calculation`);
        }
    );

    test('Should reject a selected player missing from the starting lineup', () => {
        const teamOne = createTeam();
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 's',
                setPlayId: 's',
                name: 'RK',
                type: SetPlayEnumType.RyszardKowalski,
                userData: { playerId: 'reserve' }
            }
        ];
        expect(() =>
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            })
        ).toThrow('Selected player is not in starting lineup: reserve');
    });

    test('Should reject missing Spartacus opponent scores', () => {
        const teamOne = createTeam();
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 's',
                setPlayId: 's',
                name: 'Spartacus',
                type: SetPlayEnumType.Spartacus,
                userData: {
                    ownPlayerId: 'leader',
                    opponentPlayerId: 'missing'
                },
                adminData: { ownAverage: 1, opponentAverage: 2 }
            }
        ];
        expect(() =>
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            })
        ).toThrow('Missing Spartacus opponent: missing');
    });

    test.each([
        { type: SetPlayEnumType.Awatar, label: 'Awatar' },
        { type: SetPlayEnumType.Rezerwa, label: 'Rezerwa' },
        { type: SetPlayEnumType.RezerwaGielda, label: 'Rezerwa Giełda' }
    ] as const)(
        'Should reject missing replacement player data and admin heats for $label',
        ({ type, label }) => {
            const teamOne = createTeam();
            teamOne.setPlayList =
                type === SetPlayEnumType.Awatar
                    ? [
                          {
                              selectedSetPlayId: 'a',
                              setPlayId: 'a',
                              name: 'Awatar',
                              type,
                              userData: {
                                  playerId: 'replacement',
                                  replacedPlayerId: 'four'
                              },
                              adminData: {
                                  ...createReplacementScores([3]),
                                  isDisabled: false
                              }
                          }
                      ]
                    : [
                          {
                              selectedSetPlayId: 'r',
                              setPlayId: 'r',
                              name: 'Rezerwa',
                              type,
                              userData: { playerId: 'replacement' },
                              adminData: createPlayer([3])
                          }
                      ];
            expect(() =>
                calculateMatchScores({
                    roundNumber: 2,
                    teamOne,
                    teamTwo: createTeam()
                })
            ).toThrow('Missing replacement player data: replacement');
            teamOne.replacementPlayers = [
                { playerId: 'replacement', isJunior: true }
            ];
            const selection = teamOne.setPlayList[0];
            if (!('adminData' in selection) || !selection.adminData) {
                throw new Error('Expected replacement admin data fixture');
            }
            Reflect.deleteProperty(selection.adminData, 'heatOne');
            expect(() =>
                calculateMatchScores({
                    roundNumber: 2,
                    teamOne,
                    teamTwo: createTeam()
                })
            ).toThrow('Missing replacement heat data for player: replacement');
            Reflect.deleteProperty(teamOne.setPlayList[0], 'adminData');
            expect(() =>
                calculateMatchScores({
                    roundNumber: 2,
                    teamOne,
                    teamTwo: createTeam()
                })
            ).toThrow(`${label} admin data is required for score calculation`);
        }
    );

    test.each(['own', 'opponent'] as const)(
        'Should reject a missing average for the %s Awatar in Spartacus', side => {
            const teamOne = createTeam();
            const teamTwo = createTeam('opponent-');
            teamOne.setPlayList = [{
                selectedSetPlayId: 's', setPlayId: 's', name: 'Spartacus',
                type: SetPlayEnumType.Spartacus,
                userData: { ownPlayerId: 'four', opponentPlayerId: 'opponent-four' },
                adminData: { ownAverage: 1, opponentAverage: 2 }
            }];
            const awatarTeam = side === 'own' ? teamOne : teamTwo;
            awatarTeam.replacementPlayers = [{ playerId: 'replacement', isJunior: true }];
            awatarTeam.setPlayList.push({
                selectedSetPlayId: 'a', setPlayId: 'a', name: 'Awatar',
                type: SetPlayEnumType.Awatar,
                userData: { playerId: 'replacement', replacedPlayerId: side === 'own' ? 'four' : 'opponent-four' },
                adminData: { ...createReplacementScores([3, 3, 3]), isDisabled: false }
            });
            const input = { roundNumber: 2, teamOne, teamTwo };
            expect(() => calculateMatchScores(input)).toThrow('Missing Awatar average for player: replacement');
            expect(() => calculateMatchScores({ ...input, roundNumber: 1 })).not.toThrow();
        }
    );

    test('Should reject an Awatar target outside the starting lineup', () => {
        const teamOne = createTeam();
        teamOne.setPlayList = [{
            selectedSetPlayId: 'a', setPlayId: 'a', name: 'Awatar',
            type: SetPlayEnumType.Awatar,
            userData: { playerId: 'replacement', replacedPlayerId: 'missing' },
            adminData: { ...createReplacementScores([3]), isDisabled: false }
        }];
        expect(() => calculateMatchScores({ roundNumber: 2, teamOne, teamTwo: createTeam() }))
            .toThrow('Selected player is not in starting lineup: missing');
    });

    test('Should reject a Remis selection without a result for a starting lineup rider', () => {
        const teamOne = createTeam();
        teamOne.setPlayList = [{
            selectedSetPlayId: 'remis', setPlayId: 'remis', name: 'Remis',
            type: SetPlayEnumType.Remis,
            adminData: { leader: false, joker: false, captain: false, four: false }
        }];
        expect(() => calculateMatchScores({ roundNumber: 2, teamOne, teamTwo: createTeam() }))
            .toThrow('Missing Remis result for player: five');
    });

    test('Should calculate total scores for both teams with no selected set plays', () => {
        const teamOne = createTeam();
        const teamTwo = createTeam();
        teamTwo.players[2].heatThree.value = 1;
        const before = structuredClone({ teamOne, teamTwo });
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo
        });

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
                roundNumber: 2,
                teamOne: {
                    ...teamOne,
                    players: [...teamOne.players].reverse()
                },
                teamTwo
            })
        ).toEqual(result);
        expect(
            calculateMatchScores({ roundNumber: 2, teamOne, teamTwo })
        ).toEqual(result);
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
            return calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            }).teamOne.players[0].setPlay;
        });
        expect(points).toEqual([0, 1, 2, 3, 4, 5, 5]);
    });

    test('Should disable only PN and include the final non-nominated bonus only for a junior P rider', () => {
        const teamOne = createTeam();
        teamOne.startingLineup.roles.pn.isDisabled = true;
        teamOne.players[2].isJunior = true;
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
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
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            }).teamOne.players[0].setPlay
        ).toBe(5);
    });

    test('Should count an entered last zero while skipping unused heats for Joker and P', () => {
        const teamOne = createTeam();
        teamOne.players[2].heatFour.value = 0;
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(result.teamOne.players[1].comment).toBe('Joker 2, KB 2');
        expect(result.teamOne.players[2].comment).toBe('Kapitan 0, P 0');
    });

    test('Should award zero for submitted riders with no starts and keep every trainer heat numeric', () => {
        const teamOne = createTeam();
        teamOne.players = teamOne.players.map(player => {
            return { ...createPlayer([]), playerId: player.playerId };
        });
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: teamOne
        });
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
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            });
            expect(result.teamOne.players[1].comment).toBe(comment);
        }
    );

    test("Should compare Kapitan heat totals without the opponent's awards", () => {
        const teamTwo = createTeam();
        teamTwo.players[2].heatThree.value = 3;
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne: createTeam(),
            teamTwo
        });
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
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
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
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(result.teamOne.players[1].comment).toBe('Joker 5, KB 3');
    });
    test('Should calculate all functions and save points to players setPlay total before Remis and retain an uncapped NCD6 award', () => {
        const teamOne = createTeam();
        teamOne.startingLineup.roles.pn.playerId = 'captain';
        teamOne.startingLineup.roles.p = 'leader';
        teamOne.players[2].heatThree.value = 3;
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 'remis',
                setPlayId: 'r',
                name: 'Remis',
                type: SetPlayEnumType.Remis,
                adminData: {
                    captain: true,
                    leader: false,
                    joker: false,
                    four: false,
                    five: false
                }
            },
            {
                selectedSetPlayId: 'ncd6',
                setPlayId: 'n',
                name: 'NCD6',
                type: SetPlayEnumType.Ncd6,
                userData: { playerId: 'captain' },
                adminData: { playerIdList: ['captain', 'a', 'b', 'c'] }
            }
        ];
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(result.teamOne.players[2].setPlay).toBe(16);
        expect(result.teamOne.players[2].comment).toBe(
            'Kapitan 4, PN 3, Remis 3/6 (limit 10), NCD6 6'
        );
    });
    test('Should keep GS virtual starts separate while applying their allowed function and trainer effects', () => {
        const teamOne = createTeam();
        teamOne.players[0] = { ...createPlayer([3, 3, 3]), playerId: 'leader' };
        teamOne.players[0].heatThree.bonus = true;
        teamOne.players[4] = { ...createPlayer([2, 2]), playerId: 'five' };
        teamOne.startingLineup.roles.kb = 'leader';
        teamOne.startingLineup.roles.pn.playerId = 'joker';
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 'gs1',
                setPlayId: 'gs',
                name: 'GS',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: 'leader' }
            },
            {
                selectedSetPlayId: 'gs2',
                setPlayId: 'gs',
                name: 'GS',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: 'five' }
            }
        ];
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(result.teamOne.players[0].comment).toBe(
            'Lider 5, KB 3, GS 2/6 (limit 10)'
        );
        expect(result.teamOne.players[0].heatFour.value).toBeNull();
        expect(result.teamOne.players[4].setPlay).toBe(6);
        expect(result.teamOne.trainer.heatFive).toBe(2);
        const jokerGs = createTeam();
        jokerGs.players[1] = { ...createPlayer([3]), playerId: 'joker' };
        jokerGs.setPlayList = [
            {
                selectedSetPlayId: 'gs',
                setPlayId: 'gs',
                name: 'GS',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: 'joker' }
            }
        ];
        expect(
            calculateMatchScores({
                roundNumber: 2,
                teamOne: jokerGs,
                teamTwo: createTeam()
            }).teamOne.trainer.heatTwo
        ).toBe(0);
        teamOne.players[0] = { ...createPlayer([]), playerId: 'leader' };
        expect(
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            }).teamOne.players[0].comment
        ).toBe('Lider 0, KB 0, GS 0');
    });

    test('Should add one Lider copy per MKC selection up to four and preserve saved selection order at the cap', () => {
        const teamOne = createTeam();
        teamOne.startingLineup.roles.pn.isDisabled = true;
        const mkc = {
            selectedSetPlayId: 'mkc',
            setPlayId: 'mkc',
            name: 'MKC',
            type: SetPlayEnumType.MortalKombatCombo
        } as const;
        teamOne.setPlayList = [mkc];
        const singleMkc = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        }).teamOne.players[0];
        expect(singleMkc.setPlay).toBe(4);
        expect(singleMkc.comment).toBe('Lider 2, PN 0 (pominięty), MKC 2');
        expect(12 + singleMkc.setPlay).toBe(16);
        teamOne.setPlayList = [mkc, { ...mkc, selectedSetPlayId: 'mkc2' }];
        expect(
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            }).teamOne.players[0].comment
        ).toBe('Lider 2, PN 0 (pominięty), MKC 2, MKC 2');
        teamOne.players[0] = {
            ...createPlayer([3, 3, 3, 3, 3]),
            playerId: 'leader'
        };
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(result.teamOne.players[0].comment).toBe(
            'Lider 5, PN 0 (pominięty), MKC 4, MKC 1/4 (limit 10)'
        );
        expect(result.teamOne.players[0].setPlay).toBe(10);
        expect(result.teamOne.players[0].comment!.length).toBeLessThanOrEqual(
            255
        );
    });

    test('Should keep the -2 NCD6 penalty on a player while the team score stays at zero', () => {
        const teamOne = createTeam();
        teamOne.players = teamOne.players.map(player => ({
            ...createPlayer([]),
            playerId: player.playerId
        }));
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 'n6',
                setPlayId: 'n6',
                name: 'NCD6',
                type: SetPlayEnumType.Ncd6,
                userData: { playerId: 'leader' },
                adminData: {
                    playerIdList: ['other1', 'other2', 'other3', 'other4']
                }
            }
        ];
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(result.teamOne.players[0].setPlay).toBe(-2);
        expect(result.teamOne.players[0].comment).toBe(
            'Lider 0, PN 0, NCD6 -2'
        );
        expect(result.teamOneScore).toBe(0);
        const positiveTeam = createTeam();
        positiveTeam.setPlayList = teamOne.setPlayList;
        const opponent = createTeam();
        opponent.players[2].heatThree.value = 1;
        const positiveResult = calculateMatchScores({
            roundNumber: 2,
            teamOne: positiveTeam,
            teamTwo: opponent
        });
        expect(positiveResult.teamOneScore).toBe(70);
        expect(positiveResult.teamOne.players[0].setPlay).toBe(3);
        expect(positiveResult.teamOne.players[0].comment).toBe(
            'Lider 2, PN 3, NCD6 -2'
        );
    });

    test('Should award NCD, threshold-qualified Spartacus and RK before capping sixth-start Taktyczna', () => {
        const teamOne = createTeam();
        teamOne.players[3] = {
            ...createPlayer([1, 1, 1, 1, 2, 2]),
            playerId: 'four'
        };
        teamOne.players[3].heatFive.bonus = true;
        teamOne.players[3].heatSix.bonus = true;
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 'n',
                setPlayId: 'n',
                name: 'NCD',
                type: SetPlayEnumType.Ncd,
                userData: { playerId: 'leader' },
                adminData: { playerIdList: ['leader', 'a', 'b', 'c'] }
            },
            {
                selectedSetPlayId: 's',
                setPlayId: 's',
                name: 'Spartacus',
                type: SetPlayEnumType.Spartacus,
                userData: {
                    ownPlayerId: 'four',
                    opponentPlayerId: 'opponent-joker'
                },
                adminData: { ownAverage: 1.08, opponentAverage: 1.2 }
            },
            {
                selectedSetPlayId: 'rk',
                setPlayId: 'rk',
                name: 'RK',
                type: SetPlayEnumType.RyszardKowalski,
                userData: { playerId: 'four' }
            },
            {
                selectedSetPlayId: 't',
                setPlayId: 't',
                name: 'Taktyczna',
                type: SetPlayEnumType.Taktyczna
            }
        ];
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam('opponent-')
        });
        expect(result.teamOne.players[0].comment).toBe(
            'Lider 2, PN 3, NCD 4, Taktyczna 0'
        );
        expect(result.teamOne.players[3].comment).toBe(
            'Spartacus 3, Ryszard Kowalski 6, Taktyczna 1/2 (limit 10)'
        );
        const spartacus = teamOne.setPlayList.find(
            selection => selection.type === SetPlayEnumType.Spartacus
        );
        if (
            spartacus?.type === SetPlayEnumType.Spartacus &&
            spartacus.adminData
        ) {
            spartacus.adminData.ownAverage = 1.084;
        }
        expect(
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam('opponent-')
            }).teamOne.players[3].comment
        ).toBe('Spartacus 0, Ryszard Kowalski 6, Taktyczna 2');
        if (
            spartacus?.type === SetPlayEnumType.Spartacus &&
            spartacus.adminData
        ) {
            spartacus.adminData.ownAverage = 1.08;
        }
        expect(
            calculateMatchScores({
                roundNumber: 1,
                teamOne,
                teamTwo: createTeam('opponent-')
            }).teamOne.players[3].comment
        ).toBe('Spartacus 0, Ryszard Kowalski 6, Taktyczna 2');
        for (const opponentHeats of [
            [3, 3, 2],
            [3, 3, 3]
        ]) {
            const opponent = createTeam('opponent-');
            opponent.players[1] = {
                ...createPlayer(opponentHeats),
                playerId: 'opponent-joker'
            };
            expect(
                calculateMatchScores({
                    roundNumber: 2,
                    teamOne,
                    teamTwo: opponent
                }).teamOne.players[3].comment
            ).toBe('Spartacus 0, Ryszard Kowalski 6, Taktyczna 2');
        }
    });
    test('Should apply Remis and RK in saved order and limit NCD to the remaining allowance', () => {
        const teamOne = createTeam();
        teamOne.players[3] = {
            ...createPlayer([1, 1, 1, 1, 2]),
            playerId: 'four'
        };
        teamOne.players[3].heatFive.bonus = true;
        const remis = {
            selectedSetPlayId: 'r',
            setPlayId: 'r',
            name: 'Remis',
            type: SetPlayEnumType.Remis,
            adminData: {
                leader: false,
                joker: false,
                captain: false,
                four: true,
                five: false
            }
        } as const;
        const rk = {
            selectedSetPlayId: 'rk',
            setPlayId: 'rk',
            name: 'RK',
            type: SetPlayEnumType.RyszardKowalski,
            userData: { playerId: 'four' }
        } as const;
        const ncd = {
            selectedSetPlayId: 'n',
            setPlayId: 'n',
            name: 'NCD',
            type: SetPlayEnumType.Ncd as const,
            userData: { playerId: 'four' },
            adminData: { playerIdList: ['four', 'a', 'b', 'c'] }
        };
        teamOne.setPlayList = [remis, rk, ncd];
        const first = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(first.teamOne.players[3].setPlay).toBe(10);
        expect(first.teamOne.players[3].comment).toBe(
            'Remis 6, Ryszard Kowalski 4/6 (limit 10), NCD 0/4 (limit 10)'
        );
        teamOne.setPlayList = [rk, remis, ncd];
        expect(
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            }).teamOne.players[3].comment
        ).toBe('Ryszard Kowalski 6, Remis 4/6 (limit 10), NCD 0/4 (limit 10)');
        teamOne.setPlayList = [
            { ...ncd, adminData: { playerIdList: ['a', 'b', 'c', 'd'] } }
        ];
        const wrongPrediction = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(wrongPrediction.teamOne.players[3].setPlay).toBe(0);
        expect(wrongPrediction.teamOne.players[3].comment).toBe('NCD 0');
        teamOne.players[3] = { ...createPlayer([1, 1, 2]), playerId: 'four' };
        teamOne.players[3].heatThree.bonus = true;
        teamOne.setPlayList = [rk];
        expect(
            calculateMatchScores({
                roundNumber: 2,
                teamOne,
                teamTwo: createTeam()
            }).teamOne.players[3].comment
        ).toBe('Ryszard Kowalski 4');
    });

    test('Should use GS for Kapitan while P, RK and Spartacus use only actual starts', () => {
        const teamOne = createTeam();
        const teamTwo = createTeam('opponent-');
        teamTwo.players[2].heatThree.value = 1;
        teamTwo.players[1].heatThree.value = 2;
        for (const index of [2, 3]) {
            const playerId = teamOne.players[index].playerId;
            teamOne.players[index] = { ...createPlayer([3, 2, 1]), playerId };
            teamOne.players[index].heatThree.isNominated = true;
        }
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 'gs1',
                setPlayId: 'gs',
                name: 'GS',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: 'captain' }
            },
            {
                selectedSetPlayId: 'gs2',
                setPlayId: 'gs',
                name: 'GS',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: 'four' }
            },
            {
                selectedSetPlayId: 'rk',
                setPlayId: 'rk',
                name: 'RK',
                type: SetPlayEnumType.RyszardKowalski,
                userData: { playerId: 'four' }
            },
            {
                selectedSetPlayId: 's',
                setPlayId: 's',
                name: 'Spartacus',
                type: SetPlayEnumType.Spartacus,
                userData: {
                    ownPlayerId: 'four',
                    opponentPlayerId: 'opponent-joker'
                },
                adminData: { ownAverage: 1.08, opponentAverage: 1.2 }
            }
        ];
        const before = structuredClone({ teamOne, teamTwo });
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo
        });
        expect(result.teamOne.players[2].comment).toBe('Kapitan 4, P 2, GS 2');
        expect(result.teamTwo.players[2].comment).toBe('Kapitan 0, P 2');
        expect(result.teamOne.players[3].setPlay).toBe(4);
        expect(result.teamOne.players[3].comment).toBe(
            'GS 2, Ryszard Kowalski 2, Spartacus 0'
        );
        expect(result.teamOne.players[2].heatFour.value).toBeNull();
        expect({ teamOne, teamTwo }).toEqual(before);
    });

    test('Should use enabled Awatar results and junior status while preserving nominal heats and GS targeting', () => {
        const teamOne = createTeam();
        teamOne.replacementPlayers = [{ playerId: 'avatar', isJunior: true }];
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 'a',
                setPlayId: 'a',
                name: 'Awatar',
                type: SetPlayEnumType.Awatar,
                userData: { playerId: 'avatar', replacedPlayerId: 'captain' },
                adminData: { ...createReplacementScores([3, 2]), isDisabled: false }
            },
            {
                selectedSetPlayId: 'gs',
                setPlayId: 'gs',
                name: 'GS',
                type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: 'captain' }
            }
        ];
        const firstAvatar = teamOne.setPlayList[0];
        if (firstAvatar.type !== SetPlayEnumType.Awatar) {
            throw new Error('Expected Awatar fixture');
        }
        firstAvatar.adminData.heatTwo.bonus = true;
        const before = structuredClone(teamOne);
        const result = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(result.teamOne.players[2].playerId).toBe('captain');
        expect(result.teamOne.players[2].heatThree.value).toBe(2);
        expect(result.teamOne.players[2].comment).toBe(
            'Kapitan 4, P 2, Awatar -3, GS 4/6 (limit 10)'
        );
        expect(result.teamOne.players[2].setPlay).toBe(7);
        expect(teamOne).toEqual(before);
        const avatar = teamOne.setPlayList[0];
        if (avatar.type !== SetPlayEnumType.Awatar) {
            throw new Error('Expected Awatar fixture');
        }
        avatar.adminData.isDisabled = true;
        for (const key of Object.keys(avatar.adminData)) {
            if (key !== 'isDisabled') {
                Reflect.deleteProperty(avatar.adminData, key);
            }
        }
        teamOne.replacementPlayers = [];
        const disabled = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(disabled.teamOne.players[2].comment).toBe(
            'Kapitan 4, P 2, Awatar 0 (pominięta), GS 4'
        );
        expect(
            calculateMatchScores({
                roundNumber: 2,
                teamOne: before,
                teamTwo: createTeam()
            })
        ).toEqual(result);
    });

    test('Should combine both reserves in the best order while retaining a junior and preserving source heats', () => {
        const teamOne = createTeam();
        teamOne.players[1] = { ...createPlayer([0, 0]), playerId: 'joker' };
        teamOne.players[2] = {
            ...createPlayer([1, 0, 0]),
            playerId: 'captain'
        };
        teamOne.players[3] = {
            ...createPlayer([1, 0, 0, 0]),
            playerId: 'four',
            isJunior: true
        };
        teamOne.players[4] = {
            ...createPlayer([0, 0, 0, 0, 0]),
            playerId: 'five'
        };
        teamOne.replacementPlayers = [
            { playerId: 'junior-reserve', isJunior: true },
            { playerId: 'senior-market', isJunior: false }
        ];
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 'rg',
                setPlayId: 'rg',
                name: 'RG',
                type: SetPlayEnumType.RezerwaGielda,
                userData: { playerId: 'senior-market' },
                adminData: createPlayer([2, 3, 0, 3, 0])
            },
            {
                selectedSetPlayId: 'r',
                setPlayId: 'r',
                name: 'Rezerwa',
                type: SetPlayEnumType.Rezerwa,
                userData: { playerId: 'junior-reserve' },
                adminData: createPlayer([3, 3, 3, 3, 3])
            }
        ];
        const juniorReserve = teamOne.setPlayList[1];
        if (juniorReserve.type !== SetPlayEnumType.Rezerwa) {
            throw new Error('Expected reserve fixture');
        }
        juniorReserve.adminData.heatOne.bonus = true;
        juniorReserve.adminData.heatTwo.bonus = true;
        teamOne.setPlayList.push({
            selectedSetPlayId: 'n',
            setPlayId: 'n',
            name: 'NCD',
            type: SetPlayEnumType.Ncd,
            userData: { playerId: 'joker' },
            adminData: { playerIdList: ['junior-reserve', 'a', 'b', 'c'] }
        });
        const input = {
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam('opponent-')
        };
        const before = structuredClone(input);
        const result = calculateMatchScores(input);
        expect(result.teamOneScore).toBe(56);
        expect(result.teamOne.players[1].comment).toBe(
            'Joker 6, Rezerwa +15, NCD 0'
        );
        expect(result.teamOne.players[3].comment).toBe('Rezerwa Giełda +7');
        expect(result.teamOne.players[1].heatOne.value).toBe(0);
        expect(result.teamOne.players[3].heatOne.value).toBe(1);
        expect(result.teamOne.trainer.heatFour).toBe(3);
        expect(input).toEqual(before);
        expect(calculateMatchScores(input)).toEqual(result);
        teamOne.players.reverse();
        expect(calculateMatchScores(input)).toEqual(result);
        input.teamTwo.players[2] = {
            ...createPlayer([0, 0, 0]),
            playerId: 'opponent-captain'
        };
        const changedOpponent = calculateMatchScores(input);
        expect(result.teamOne.players[2].comment).toBe('Kapitan 0, P 0');
        expect(changedOpponent.teamOne.players[2].comment).toBe(
            'Kapitan 4, P 0'
        );
        expect(changedOpponent.teamOneScore).toBe(60);
        expect(changedOpponent.teamOne.players[1]).toEqual(
            result.teamOne.players[1]
        );
        expect(changedOpponent.teamOne.players[3]).toEqual(
            result.teamOne.players[3]
        );
    });

    test('Should leave the sole junior in place for a senior reserve and permit a junior reserve to replace him', () => {
        const teamOne = createTeam();
        teamOne.players = teamOne.players.map(player => ({
            ...createPlayer([3, 3, 3, 3, 3]),
            playerId: player.playerId
        }));
        teamOne.players[1] = {
            ...createPlayer([0, 0]),
            playerId: 'joker',
            isJunior: true
        };
        teamOne.replacementPlayers = [{ playerId: 'reserve', isJunior: false }];
        teamOne.setPlayList = [
            {
                selectedSetPlayId: 'r',
                setPlayId: 'r',
                name: 'Rezerwa',
                type: SetPlayEnumType.Rezerwa,
                userData: { playerId: 'reserve' },
                adminData: createPlayer([2, 2, 2, 2])
            }
        ];
        const unchanged = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(unchanged.teamOne.players[1].comment).toBe('Joker 0, KB 0');
        expect(unchanged.teamOne.trainer.comment).toBe('Rezerwa 0');
        teamOne.replacementPlayers[0].isJunior = true;
        const replaced = calculateMatchScores({
            roundNumber: 2,
            teamOne,
            teamTwo: createTeam()
        });
        expect(replaced.teamOne.players[1].comment).toBe('Joker 4, Rezerwa +8');
        expect(replaced.teamOne.players[1].setPlay).toBe(12);
        expect(replaced.teamOne.players[1].heatOne.value).toBe(0);
    });
    test('Should use the Awatar draw checkbox for Remis without changing original rider results', () => {
        const teamOne = createTeam();
        teamOne.players[1] = {
            ...createPlayer([0, 0]), playerId: 'joker', isJunior: true
        };
        teamOne.replacementPlayers = [{ playerId: 'reserve', isJunior: true }];
        const results = {
            leader: false, joker: false, captain: false, four: false, five: false
        };
        const replacement = {
            selectedSetPlayId: 'a',
            setPlayId: 'a',
            name: 'Awatar',
            type: SetPlayEnumType.Awatar as const,
            userData: { playerId: 'reserve', replacedPlayerId: 'joker' },
            adminData: {
                ...createReplacementScores([3, 3, 3, 3, 3]),
                isMatchDraw: true,
                isDisabled: false
            }
        };
        teamOne.setPlayList = [replacement, {
            selectedSetPlayId: 'remis', setPlayId: 'remis', name: 'Remis',
            type: SetPlayEnumType.Remis, adminData: results
        }];
        const result = calculateMatchScores({ roundNumber: 2, teamOne, teamTwo: createTeam() });
        expect(result.teamOne.players[1].comment).toBe('Joker 6, KB 0, Awatar +15, Remis 4/6 (limit 10)');
        expect(result.teamOne.players[1].setPlay).toBe(25);
        results.joker = true;
        replacement.adminData.isMatchDraw = false;
        expect(calculateMatchScores({ roundNumber: 2, teamOne, teamTwo: createTeam() })
            .teamOne.players[1].comment).toBe('Joker 6, KB 0, Awatar +15, Remis 0');
        replacement.adminData.isDisabled = true;
        expect(calculateMatchScores({ roundNumber: 2, teamOne, teamTwo: createTeam() })
            .teamOne.players[1].comment).toBe('Joker 0, KB 0, Awatar 0 (pominięta), Remis 6');
        replacement.adminData.isDisabled = false;
        teamOne.setPlayList = [replacement];
        replacement.adminData.isMatchDraw = true;
        expect(calculateMatchScores({ roundNumber: 2, teamOne, teamTwo: createTeam() })
            .teamOne.players[1].comment).toBe('Joker 6, KB 0, Awatar +15');
    });

    test.each([SetPlayEnumType.Rezerwa, SetPlayEnumType.RezerwaGielda] as const)(
        'Should exclude %s riders from Remis, Taktyczna and the replaced rider role', type => {
            const teamOne = createTeam();
            teamOne.players[1] = { ...createPlayer([0, 0]), playerId: 'joker', isJunior: true };
            teamOne.replacementPlayers = [{ playerId: 'reserve', isJunior: true }];
            const scores = createPlayer([3, 3, 3, 3, 3, 2]);
            scores.heatSix.bonus = true;
            teamOne.setPlayList = [
                { selectedSetPlayId: 'r', setPlayId: 'r', name: 'Rezerwa', type,
                    userData: { playerId: 'reserve' }, adminData: scores },
                { selectedSetPlayId: 'remis', setPlayId: 'remis', name: 'Remis', type: SetPlayEnumType.Remis,
                    adminData: { leader: false, joker: true, captain: false, four: false, five: false } },
                { selectedSetPlayId: 't', setPlayId: 't', name: 'Taktyczna', type: SetPlayEnumType.Taktyczna }
            ];
            const result = calculateMatchScores({ roundNumber: 2, teamOne, teamTwo: createTeam() });
            const label = type === SetPlayEnumType.Rezerwa ? 'Rezerwa' : 'Rezerwa Giełda';
            expect(result.teamOne.players[1].comment).toBe(`Joker 5, ${label} +17, Remis 0, Taktyczna 0`);
            expect(result.teamOne.players[1].setPlay).toBe(22);
            expect(result.teamOne.players[1].heatOne.value).toBe(0);
        }
    );
    test('Should use an opponent Awatar score and pre-round average for Spartacus and restore the original when disabled', () => {
        const teamOne = createTeam();
        const teamTwo = createTeam('opponent-');
        teamOne.players[3] = { ...createPlayer([3, 3, 3, 1]), playerId: 'four' };
        const spartacus = {
            selectedSetPlayId: 's', setPlayId: 's', name: 'Spartacus',
            type: SetPlayEnumType.Spartacus as const,
            userData: { ownPlayerId: 'four', opponentPlayerId: 'opponent-four' },
            adminData: { ownAverage: 1, opponentAverage: 1.2 }
        };
        const awatar = {
            selectedSetPlayId: 'a', setPlayId: 'a', name: 'Awatar',
            type: SetPlayEnumType.Awatar as const,
            userData: { playerId: 'replacement', replacedPlayerId: 'opponent-four' },
            adminData: { ...createReplacementScores([3, 3, 3, 2]), average: 1.2, isDisabled: false }
        };
        teamOne.setPlayList = [spartacus];
        teamTwo.replacementPlayers = [{ playerId: 'replacement', isJunior: true }];
        teamTwo.setPlayList = [awatar];
        const input = { roundNumber: 2, teamOne, teamTwo };
        expect(calculateMatchScores(input).teamOne.players[3].comment).toBe('Spartacus 0');
        awatar.adminData = { ...awatar.adminData, ...createReplacementScores([3, 3, 2]), average: 1.1 };
        expect(calculateMatchScores(input).teamOne.players[3].comment).toBe('Spartacus 0');
        awatar.adminData.average = 1.12;
        const before = structuredClone(input);
        expect(calculateMatchScores(input).teamOne.players[3].comment).toBe('Spartacus 3');
        expect(input).toEqual(before);
        awatar.adminData.average = 0.5;
        awatar.adminData.isDisabled = true;
        expect(calculateMatchScores(input).teamOne.players[3].comment).toBe('Spartacus 3');
    });

    test('Should use our Awatar average including zero while opponent reserves leave the selected Spartacus duel unchanged', () => {
        const teamOne = createTeam();
        const teamTwo = createTeam('opponent-');
        teamTwo.players = teamTwo.players.map(player => {
            return {
                ...createPlayer([3, 3, 3, 3, 3]), playerId: player.playerId,
                isJunior: player.playerId === 'opponent-five'
            };
        });
        teamTwo.players[3] = { ...createPlayer([3, 3, 2]), playerId: 'opponent-four' };
        const spartacus = {
            selectedSetPlayId: 's', setPlayId: 's', name: 'Spartacus',
            type: SetPlayEnumType.Spartacus as const,
            userData: { ownPlayerId: 'four', opponentPlayerId: 'opponent-four' },
            adminData: { ownAverage: 1, opponentAverage: 1.2 }
        };
        const awatar = {
            selectedSetPlayId: 'a', setPlayId: 'a', name: 'Awatar',
            type: SetPlayEnumType.Awatar as const,
            userData: { playerId: 'replacement', replacedPlayerId: 'four' },
            adminData: { ...createReplacementScores([3, 3, 3, 2]), average: 1.1, isDisabled: false }
        };
        teamOne.replacementPlayers = [{ playerId: 'replacement', isJunior: true }];
        teamOne.setPlayList = [spartacus, awatar];
        const opponentAwatar = {
            selectedSetPlayId: 'opponent-a', setPlayId: 'opponent-a', name: 'Awatar',
            type: SetPlayEnumType.Awatar as const,
            userData: { playerId: 'opponent-avatar', replacedPlayerId: 'opponent-four' },
            adminData: { ...createReplacementScores([3, 3, 3]), average: 1.2, isDisabled: false }
        };
        spartacus.adminData.opponentAverage = 0.5;
        teamTwo.replacementPlayers = [
            { playerId: 'reserve', isJunior: true },
            { playerId: 'opponent-avatar', isJunior: true }
        ];
        teamTwo.setPlayList = [opponentAwatar, {
            selectedSetPlayId: 'r', setPlayId: 'r', name: 'Rezerwa',
            type: SetPlayEnumType.Rezerwa, userData: { playerId: 'reserve' },
            adminData: createPlayer([3, 3, 3, 3, 3])
        }];
        const input = { roundNumber: 2, teamOne, teamTwo };
        expect(calculateMatchScores(input).teamOne.players[3].comment).toBe('Awatar +3, Spartacus 0');
        awatar.adminData.average = 1.08;
        const result = calculateMatchScores(input);
        expect(result.teamOne.players[3].comment).toBe('Awatar +3, Spartacus 3');
        expect(result.teamTwo.players[3].comment).toBe('Awatar/Rezerwa +7');
        opponentAwatar.adminData.average = 0.12;
        awatar.adminData.average = 0;
        expect(calculateMatchScores(input).teamOne.players[3].comment).toBe('Awatar +3, Spartacus 3');
        awatar.adminData.isDisabled = true;
        expect(calculateMatchScores(input).teamOne.players[3].comment).toBe('Spartacus 0, Awatar 0 (pominięta)');
    });

    test('Should retain the first equally scoring reserve arrangement and leave the lineup unchanged when it ties', () => {
        const teamOne = createTeam();
        teamOne.players = teamOne.players.map(player => {
            return {
                ...createPlayer([3, 3, 3, 3, 3]), playerId: player.playerId,
                isJunior: player.playerId === 'five'
            };
        });
        teamOne.replacementPlayers = [
            { playerId: 'reserve', isJunior: true }, { playerId: 'market', isJunior: true }
        ];
        const reserve = {
            selectedSetPlayId: 'r', setPlayId: 'r', name: 'Rezerwa',
            type: SetPlayEnumType.Rezerwa as const, userData: { playerId: 'reserve' },
            adminData: createPlayer([3, 3, 3, 3, 3])
        };
        const market = {
            ...reserve, selectedSetPlayId: 'rg', setPlayId: 'rg',
            type: SetPlayEnumType.RezerwaGielda as const, userData: { playerId: 'market' }
        };
        teamOne.setPlayList = [reserve, market];
        const input = { roundNumber: 2, teamOne, teamTwo: createTeam('opponent-') };
        const unchanged = calculateMatchScores(input);
        expect(unchanged.teamOne.players.map(player => player.comment)).toEqual([
            'Lider 5, PN 0', 'Joker 6, KB 0', 'Kapitan 4, P 3', '', ''
        ]);
        expect(unchanged.teamOne.trainer.comment).toBe('Rezerwa 0, Rezerwa Giełda 0');
        reserve.adminData = createPlayer([3, 3, 3, 3, 3, 2]);
        market.adminData = createPlayer([3, 3, 3, 3, 3, 2]);
        const tied = calculateMatchScores(input);
        expect(tied.teamOne.players.map(player => player.comment)).toEqual([
            'Lider 5, Rezerwa +2', 'Joker 6, KB 0', 'Kapitan 4, P 3', 'Rezerwa Giełda +2', ''
        ]);
        expect(tied.teamOneScore).toBe(112);
    });

    test('Should preserve an earned role when replacing the lowest raw scorer would produce fewer points', () => {
        const teamOne = createTeam();
        teamOne.players = teamOne.players.map(player => {
            return {
                ...createPlayer([3, 3, 3, 3, 3]), playerId: player.playerId,
                isJunior: player.playerId === 'five'
            };
        });
        teamOne.players[3] = { ...createPlayer([3, 2, 0, 0, 0]), playerId: 'four' };
        teamOne.players[3].heatOne.isNominated = true;
        teamOne.players[4] = { ...createPlayer([3, 3, 0, 0, 0]), playerId: 'five', isJunior: true };
        teamOne.startingLineup.roles.pn.playerId = 'four';
        teamOne.replacementPlayers = [{ playerId: 'reserve', isJunior: true }];
        teamOne.setPlayList = [{
            selectedSetPlayId: 'r', setPlayId: 'r', name: 'Rezerwa',
            type: SetPlayEnumType.Rezerwa, userData: { playerId: 'reserve' },
            adminData: createPlayer([3, 3, 2, 0, 0])
        }];
        const result = calculateMatchScores({ roundNumber: 2, teamOne, teamTwo: createTeam('opponent-') });
        expect(result.teamOne.players[3].comment).toBe('PN 3');
        expect(result.teamOne.players[4].comment).toBe('Rezerwa +2');
        expect(result.teamOneScore).toBe(88);
    });

    test('Should apply one nominal adjustment when a reserve replaces Awatar and exclude inherited plays and virtual GS starts', () => {
        const teamOne = createTeam();
        teamOne.players = teamOne.players.map(player => {
            return {
                ...createPlayer([3, 3, 3, 3, 3]), playerId: player.playerId
            };
        });
        teamOne.players[4] = { ...createPlayer([0]), playerId: 'five', isJunior: true };
        teamOne.startingLineup.roles.pn.playerId = 'five';
        teamOne.replacementPlayers = [
            { playerId: 'avatar', isJunior: true }, { playerId: 'reserve', isJunior: true }
        ];
        const reserveScores = createPlayer([4, 3, 3, 3]);
        reserveScores.heatOne.bonus = true;
        teamOne.setPlayList = [
            { selectedSetPlayId: 'a', setPlayId: 'a', name: 'Awatar', type: SetPlayEnumType.Awatar,
                userData: { playerId: 'avatar', replacedPlayerId: 'five' },
                adminData: { ...createReplacementScores([1]), isMatchDraw: true, isDisabled: false } },
            { selectedSetPlayId: 'r', setPlayId: 'r', name: 'Rezerwa', type: SetPlayEnumType.Rezerwa,
                userData: { playerId: 'reserve' }, adminData: reserveScores },
            { selectedSetPlayId: 'gs', setPlayId: 'gs', name: 'GS', type: SetPlayEnumType.GwarancjaStartow,
                userData: { playerId: 'five' } },
            { selectedSetPlayId: 'remis', setPlayId: 'remis', name: 'Remis', type: SetPlayEnumType.Remis,
                adminData: { leader: false, joker: false, captain: false, four: false, five: false } },
            { selectedSetPlayId: 't', setPlayId: 't', name: 'Taktyczna', type: SetPlayEnumType.Taktyczna }
        ];
        const input = { roundNumber: 2, teamOne, teamTwo: createTeam('opponent-') };
        const before = structuredClone(input);
        const result = calculateMatchScores(input);
        expect(result.teamOne.players[4].comment).toBe('Awatar/Rezerwa +13, GS 0, Remis 0, Taktyczna 0');
        expect(result.teamOne.players[4].setPlay).toBe(13);
        expect(result.teamOne.players[4].heatOne.value).toBe(0);
        expect(result.teamOne.trainer.heatFive).toBe(0);
        expect(input).toEqual(before);
        expect(calculateMatchScores(input)).toEqual(result);
    });

    test('Should award no Spartacus points when a reserve replaces our selected rider', () => {
        const teamOne = createTeam();
        teamOne.replacementPlayers = [{ playerId: 'reserve', isJunior: true }];
        teamOne.setPlayList = [
            { selectedSetPlayId: 'r', setPlayId: 'r', name: 'Rezerwa', type: SetPlayEnumType.Rezerwa,
                userData: { playerId: 'reserve' }, adminData: createPlayer([3, 3, 3, 3, 3]) },
            { selectedSetPlayId: 's', setPlayId: 's', name: 'Spartacus', type: SetPlayEnumType.Spartacus,
                userData: { ownPlayerId: 'joker', opponentPlayerId: 'opponent-joker' },
                adminData: { ownAverage: 1, opponentAverage: 1.2 } }
        ];
        const result = calculateMatchScores({
            roundNumber: 2, teamOne, teamTwo: createTeam('opponent-')
        });
        expect(result.teamOne.players[1].comment).toBe('Joker 6, Rezerwa +10, Spartacus 0');
    });
});
