import type {
    CalculateKapitanParamsType,
    GetTrainerHeatTotalParamsType,
    CalculateMatchScoresParamsType,
    CalculateMatchScoresReturnType,
    CalculatePlayerParamsType,
    CalculatePrimusNominatusParamsType,
    CalculateTrainerParamsType,
    CalculationTeamReturnType,
    CalculationTeamType,
    ScoreModifierType,
    CalculationSlotType,
    ScoreTeamParamsType,
    SelectReserveLineupParamsType,
    GetEffectivePlayersParamsType,
    ReplacementPlayerParamsType,
    GetSpartacusAverageParamsType,
    GenerateStartingLineupMatrixParamsType
} from '@/db/db.types';

import {
    CALCULATION_HEAT_KEYS,
    DISABLED_SET_PLAY_COMMENT_SUFFIX,
    KAPITAN_POINTS,
    LIDER_FIRST_POINT_TOTAL,
    MAX_LIDER_POINTS,
    MAX_PLAYER_MODIFIER_POINTS,
    ORDINARY_RACE_BONUS,
    SPARTACUS_MIN_ROUND,
    STARTING_LINEUP_POSITION_KEYS,
    FIFTH_PLAYER_INDEX
} from '@/db/db.constants';
import { SetPlayEnumType } from '@/db/models/schema.types';
import { getActualHeats, getPlayerTotal } from '@/db/player-scores.utils';
import {
    calculateGwarancjaStartow,
    calculateMuchomor,
    calculateBrudnaPala,
    calculateTyper,
    calculatePauloSousa,
    calculatePijanyCieslak,
    calculateKoloFortunyNorbiego,
    calculateRemis,
    calculateMortalKombatCombo,
    calculateNcd,
    calculateNcd6,
    calculateSpartacus,
    calculateRyszardKowalski,
    calculateTaktyczna,
    calculateAwatar,
    calculateReplacement
} from '@/db/set-plays.utils';
import { SET_PLAY_SHORT_LABELS } from '@/utils/utils.constants';

function getTrainerHeatTotal(params: GetTrainerHeatTotalParamsType): number {
    return CALCULATION_HEAT_KEYS.reduce(
        (total, key) => total + params.trainer[key],
        0
    );
}

function getTeamTotal(params: CalculationTeamReturnType) {
    return (
        params.players.reduce((total, player) => {
            return total + getPlayerTotal({ player }) + player.setPlay;
        }, 0) +
        getTrainerHeatTotal({ trainer: params.trainer }) +
        params.trainer.setPlay
    );
}

export function calculateLider(params: CalculatePlayerParamsType): number {
    return Math.max(
        0,
        Math.min(
            MAX_LIDER_POINTS,
            MAX_PLAYER_MODIFIER_POINTS,
            getPlayerTotal(params) - LIDER_FIRST_POINT_TOTAL + 1
        )
    );
}

export function calculateJoker(params: CalculatePlayerParamsType): number {
    const heats = getActualHeats(params);
    if (heats.length === 0) {
        return 0;
    }
    return (heats[0].value ?? 0) + (heats[heats.length - 1].value ?? 0);
}

export function calculateKapitan(params: CalculateKapitanParamsType): number {
    return getPlayerTotal(params) >
        getPlayerTotal({ player: params.opponentPlayer })
        ? KAPITAN_POINTS
        : 0;
}

export function calculatePrimusNominatus(
    params: CalculatePrimusNominatusParamsType
): number {
    if (params.isDisabled) {
        return 0;
    }
    return getActualHeats(params)
        .filter(heat => heat.isNominated)
        .reduce((total, heat) => total + (heat.value ?? 0), 0);
}

export function calculateKrolBonusow(
    params: CalculatePlayerParamsType
): number {
    return (
        getActualHeats(params).filter(heat => heat.bonus).length *
        ORDINARY_RACE_BONUS
    );
}

export function calculatePrzelozony(params: CalculatePlayerParamsType): number {
    const heats = getActualHeats(params).filter(heat => !heat.isNominated);
    const lastHeat = heats[heats.length - 1];
    if (!lastHeat) {
        return 0;
    }
    const bonus =
        lastHeat.bonus && !params.player.isJunior ? ORDINARY_RACE_BONUS : 0;
    return (lastHeat.value ?? 0) - bonus;
}

export function calculateTrainer(
    params: CalculateTrainerParamsType
): CalculationTeamReturnType['trainer'] {
    return {
        heatOne: params.players[0].heatOne.value ?? 0,
        heatTwo: params.players[1].heatTwo.value ?? 0,
        heatThree: params.players[2].heatThree.value ?? 0,
        heatFour: params.players[3].heatFour.value ?? 0,
        heatFive: params.players[FIFTH_PLAYER_INDEX].heatFive.value ?? 0,
        heatSix: 0,
        heatSeven: 0,
        setPlay: 0,
        comment: ''
    };
}

function prepareTeam(params: CalculationTeamType): CalculationTeamReturnType {
    const players = STARTING_LINEUP_POSITION_KEYS.map(position => {
        const playerId = params.startingLineup[position];
        const player = params.players.find(
            entry => entry.playerId === playerId
        );
        if (!player) {
            throw new Error(
                `Missing score data for starting lineup player: ${playerId}`
            );
        }
        if (
            CALCULATION_HEAT_KEYS.some(key => player[key]?.value === undefined)
        ) {
            throw new Error(`Missing heat data for player: ${playerId}`);
        }
        return {
            ...structuredClone(player),
            setPlay: 0,
            comment: ''
        };
    });
    return { players, trainer: calculateTrainer({ players }) };
}

function getReplacementPlayer(params: ReplacementPlayerParamsType) {
    const player = params.teamData.replacementPlayers?.find(
        player => player.playerId === params.playerId
    );
    if (!player) {
        throw new Error(`Missing replacement player data: ${params.playerId}`);
    }
    return player;
}

function getEffectivePlayers(params: GetEffectivePlayersParamsType) {
    const players = structuredClone(params.slots.map(slot => slot.player));
    for (const setPlay of params.teamData.setPlayList) {
        if (setPlay.type !== SetPlayEnumType.GwarancjaStartow) {
            continue;
        }
        const index = params.slots.findIndex(
            slot => slot.nominalPlayerId === setPlay.userData.playerId
        );
        if (params.slots[index].isReserve) {
            continue;
        }
        const player = players[index];
        const { virtualHeats } = calculateGwarancjaStartow({ player });
        const emptyKeys = CALCULATION_HEAT_KEYS.filter(
            key => player[key].value === null
        );
        virtualHeats.forEach((heat, heatIndex) => {
            player[emptyKeys[heatIndex]] = heat;
        });
    }
    return players;
}

// Builds the calculator’s starting lineup as five slots, ordered by the saved positions.
// Each slot keeps the original player ID and a copy of their score data, plus bookkeeping
// for whether a reserve replaces them and which replacements apply. Used to process selected set plays.
function generateStartingLineupMatrix(
    params: GenerateStartingLineupMatrixParamsType
): CalculationSlotType[] {
    const slots: CalculationSlotType[] = params.nominal.players.map(player => {
        return {
            player: structuredClone(player),
            nominalPlayerId: player.playerId,
            isReserve: false,
            replacementNames: [] as string[]
        };
    });
    for (const setPlay of params.teamData.setPlayList) {
        if (setPlay.type === SetPlayEnumType.Awatar) {
            const slot = slots.find(
                slot =>
                    slot.nominalPlayerId === setPlay.userData.replacedPlayerId
            );
            if (!slot) {
                throw new Error(
                    `Selected player is not in starting lineup: ${setPlay.userData.replacedPlayerId}`
                );
            }
            if (setPlay.adminData?.isDisabled) {
                continue;
            }
            if (!setPlay.adminData) {
                throw new Error(
                    'Awatar admin data is required for score calculation'
                );
            }
            const player = getReplacementPlayer({
                teamData: params.teamData,
                playerId: setPlay.userData.playerId
            });
            slot.player = calculateAwatar({
                player: slot.player,
                playerId: player.playerId,
                isJunior: player.isJunior,
                scores: setPlay.adminData
            });
            slot.isMatchDraw = setPlay.adminData.isMatchDraw;
            slot.replacementNames.push(SET_PLAY_SHORT_LABELS[setPlay.type]);
        }
        if (
            setPlay.type === SetPlayEnumType.Rezerwa ||
            setPlay.type === SetPlayEnumType.RezerwaGielda
        ) {
            if (!setPlay.adminData) {
                throw new Error(
                    `${SET_PLAY_SHORT_LABELS[setPlay.type]} admin data is required for score calculation`
                );
            }
            getReplacementPlayer({
                teamData: params.teamData,
                playerId: setPlay.userData.playerId
            });
        }
    }
    for (const setPlay of params.teamData.setPlayList) {
        let targetId: string | undefined;
        switch (setPlay.type) {
            case SetPlayEnumType.GwarancjaStartow:
            case SetPlayEnumType.Ncd:
            case SetPlayEnumType.Ncd6:
            case SetPlayEnumType.RyszardKowalski:
                targetId = setPlay.userData.playerId;
                break;
            case SetPlayEnumType.Spartacus:
                targetId = setPlay.userData.ownPlayerId;
                break;
        }
        if (
            targetId &&
            !slots.some(slot => slot.nominalPlayerId === targetId)
        ) {
            throw new Error(
                `Selected player is not in starting lineup: ${targetId}`
            );
        }
    }
    return slots;
}

function selectReserveLineup(
    params: SelectReserveLineupParamsType
): CalculationSlotType[] {
    const reserves = params.teamData.setPlayList.filter(
        setPlay =>
            setPlay.type === SetPlayEnumType.Rezerwa ||
            setPlay.type === SetPlayEnumType.RezerwaGielda
    );
    const orders =
        reserves.length > 1 ? [reserves, [...reserves].reverse()] : [reserves];
    let best = params.slots;
    const score = (slots: CalculationSlotType[]) => {
        return getTeamTotal(
            calculateTeamScore({
                teamData: params.teamData,
                nominal: params.nominal,
                spartacusSlots: params.slots,
                slots,
                opponentSlots: slots,
                opponentSpartacusSlots: params.opponentSpartacusSlots,
                opponentTeamData: params.teamData,
                seasonStage: params.seasonStage,
                roundNumber: params.roundNumber,
                includeCompetitiveAwards: false
            })
        );
    };
    let bestScore = score(best);
    for (const order of orders) {
        let candidates = [params.slots];
        for (const reserve of order) {
            const next = [...candidates];
            const replacementPlayer = getReplacementPlayer({
                teamData: params.teamData,
                playerId: reserve.userData.playerId
            });
            for (const candidate of candidates) {
                for (const [index, slot] of candidate.entries()) {
                    const player = calculateReplacement({
                        player: slot.player,
                        ...replacementPlayer,
                        scores: reserve.adminData
                    });
                    const updated = structuredClone(candidate);
                    updated[index] = {
                        ...slot,
                        player,
                        isReserve: true,
                        isMatchDraw: undefined,
                        replacementNames: [
                            ...slot.replacementNames,
                            SET_PLAY_SHORT_LABELS[reserve.type]
                        ]
                    };
                    if (!updated.some(slot => slot.player.isJunior)) {
                        continue;
                    }
                    next.push(updated);
                }
            }
            candidates = next;
        }
        for (const candidate of candidates) {
            const candidateScore = score(candidate);
            if (candidateScore > bestScore) {
                best = candidate;
                bestScore = candidateScore;
            }
        }
    }
    return best;
}

function getSpartacusAverage(params: GetSpartacusAverageParamsType): number {
    for (const setPlay of params.teamData.setPlayList) {
        if (
            setPlay.type !== SetPlayEnumType.Awatar ||
            setPlay.userData.replacedPlayerId !== params.nominalPlayerId ||
            setPlay.adminData.isDisabled
        ) {
            continue;
        }
        if (setPlay.adminData.average === undefined) {
            throw new Error(
                `Missing Awatar average for player: ${setPlay.userData.playerId}`
            );
        }
        return setPlay.adminData.average;
    }
    return params.average;
}

function calculateTeamScore(
    params: ScoreTeamParamsType
): CalculationTeamReturnType {
    const teamData = params.teamData;
    const team = structuredClone(params.nominal);
    const actualPlayers = params.slots.map(slot => slot.player);
    const opponentActualPlayers = params.opponentSlots.map(slot => slot.player);
    const effectivePlayers = getEffectivePlayers(params);
    team.trainer = calculateTrainer({ players: actualPlayers });
    team.trainer.heatFive =
        effectivePlayers[FIFTH_PLAYER_INDEX].heatFive.value ?? 0;
    const opponentEffectivePlayers = getEffectivePlayers({
        teamData: params.opponentTeamData,
        slots: params.opponentSlots
    });
    const opponentTrainer = calculateTrainer({
        players: opponentActualPlayers
    });
    opponentTrainer.heatFive =
        opponentEffectivePlayers[FIFTH_PLAYER_INDEX].heatFive.value ?? 0;
    const roles = teamData.startingLineup.roles;

    for (const rolePlayerId of [roles.pn.playerId, roles.kb, roles.p]) {
        if (!team.players.some(player => player.playerId === rolePlayerId)) {
            throw new Error(
                `Role player is not in starting lineup: ${rolePlayerId}`
            );
        }
    }

    team.players.forEach((player, index) => {
        const slot = params.slots[index];
        const actualPlayer = slot.player;
        const modifiers: ScoreModifierType[] = [];
        const effectivePlayer = effectivePlayers[index];
        if (index === 0) {
            modifiers.push({
                name: 'Lider',
                points: calculateLider({ player: effectivePlayer }),
                countsTowardsLimit: true
            });
        } else if (index === 1) {
            modifiers.push({
                name: 'Joker',
                points: calculateJoker({ player: actualPlayer }),
                countsTowardsLimit: true
            });
        } else if (index === 2 && params.includeCompetitiveAwards) {
            modifiers.push({
                name: 'Kapitan',
                points: calculateKapitan({
                    player: effectivePlayer,
                    opponentPlayer: opponentEffectivePlayers[index]
                }),
                countsTowardsLimit: true
            });
        }
        if (!slot.isReserve && player.playerId === roles.pn.playerId) {
            modifiers.push({
                name: roles.pn.isDisabled ? 'PN (pominięty)' : 'PN',
                points: calculatePrimusNominatus({
                    player: actualPlayer,
                    isDisabled: roles.pn.isDisabled
                }),
                countsTowardsLimit: true
            });
        }
        if (!slot.isReserve && player.playerId === roles.kb) {
            modifiers.push({
                name: 'KB',
                points: calculateKrolBonusow({ player: actualPlayer }),
                countsTowardsLimit: true
            });
        }
        if (!slot.isReserve && player.playerId === roles.p) {
            modifiers.push({
                name: 'P',
                points: calculatePrzelozony({ player: actualPlayer }),
                countsTowardsLimit: true
            });
        }
        if (slot.replacementNames.length) {
            const difference =
                getPlayerTotal({ player: actualPlayer }) -
                getPlayerTotal({ player });
            modifiers.push({
                name: slot.replacementNames.join('/'),
                points: difference,
                countsTowardsLimit: false
            });
        }
        for (const setPlay of teamData.setPlayList) {
            switch (setPlay.type) {
                case SetPlayEnumType.GwarancjaStartow:
                    if (setPlay.userData.playerId === player.playerId) {
                        modifiers.push({
                            name: SET_PLAY_SHORT_LABELS[setPlay.type],
                            points: slot.isReserve
                                ? 0
                                : calculateGwarancjaStartow({
                                      player: actualPlayer
                                  }).points,
                            countsTowardsLimit: true
                        });
                    }
                    break;
                case SetPlayEnumType.Remis:
                    if (slot.isReserve) {
                        modifiers.push({
                            name: SET_PLAY_SHORT_LABELS[setPlay.type],
                            points: 0,
                            countsTowardsLimit: true
                        });
                        break;
                    }
                    if (
                        setPlay.adminData &&
                        slot.isMatchDraw === undefined &&
                        !Object.prototype.hasOwnProperty.call(
                            setPlay.adminData,
                            actualPlayer.playerId
                        )
                    ) {
                        throw new Error(
                            `Missing Remis result for player: ${actualPlayer.playerId}`
                        );
                    }
                    modifiers.push({
                        name: SET_PLAY_SHORT_LABELS[setPlay.type],
                        points: calculateRemis({
                            setPlay,
                            player: actualPlayer,
                            isMatchDraw: slot.isMatchDraw
                        }),
                        countsTowardsLimit: true
                    });
                    break;
                case SetPlayEnumType.MortalKombatCombo:
                    if (index === 0) {
                        modifiers.push({
                            name: SET_PLAY_SHORT_LABELS[setPlay.type],
                            points: slot.isReserve
                                ? 0
                                : calculateMortalKombatCombo({
                                      liderPoints: calculateLider({
                                          player: effectivePlayer
                                      })
                                  }),
                            countsTowardsLimit: true
                        });
                    }
                    break;
                case SetPlayEnumType.Ncd:
                case SetPlayEnumType.Ncd6:
                    if (setPlay.userData.playerId === player.playerId) {
                        modifiers.push({
                            name: SET_PLAY_SHORT_LABELS[setPlay.type],
                            points: slot.isReserve
                                ? 0
                                : setPlay.type === SetPlayEnumType.Ncd
                                  ? calculateNcd({
                                        setPlay,
                                        player: actualPlayer
                                    })
                                  : calculateNcd6({
                                        setPlay,
                                        player: actualPlayer
                                    }),
                            countsTowardsLimit:
                                setPlay.type === SetPlayEnumType.Ncd
                        });
                    }
                    break;
                case SetPlayEnumType.Spartacus:
                    if (!params.includeCompetitiveAwards) {
                        break;
                    }
                    if (setPlay.userData.ownPlayerId === player.playerId) {
                        let points = 0;
                        if (!slot.isReserve) {
                            if (!setPlay.adminData) {
                                throw new Error(
                                    'Spartacus admin data is required for score calculation'
                                );
                            }
                            const opponentPlayer =
                                params.opponentSpartacusSlots.find(
                                    slot =>
                                        slot.nominalPlayerId ===
                                        setPlay.userData.opponentPlayerId
                                )?.player;
                            if (!opponentPlayer) {
                                throw new Error(
                                    `Missing Spartacus opponent: ${setPlay.userData.opponentPlayerId}`
                                );
                            }
                            if (
                                params.seasonStage === 'playoff' ||
                                params.roundNumber >= SPARTACUS_MIN_ROUND
                            ) {
                                points = calculateSpartacus({
                                    player: actualPlayer,
                                    opponentPlayer,
                                    ownAverage: getSpartacusAverage({
                                        teamData,
                                        nominalPlayerId: player.playerId,
                                        average: setPlay.adminData.ownAverage
                                    }),
                                    opponentAverage: getSpartacusAverage({
                                        teamData: params.opponentTeamData,
                                        nominalPlayerId:
                                            setPlay.userData.opponentPlayerId,
                                        average:
                                            setPlay.adminData.opponentAverage
                                    })
                                });
                            }
                        }
                        modifiers.push({
                            name: SET_PLAY_SHORT_LABELS[setPlay.type],
                            points,
                            countsTowardsLimit: true
                        });
                    }
                    break;
                case SetPlayEnumType.RyszardKowalski:
                    if (setPlay.userData.playerId === player.playerId) {
                        modifiers.push({
                            name: SET_PLAY_SHORT_LABELS[setPlay.type],
                            points: slot.isReserve
                                ? 0
                                : calculateRyszardKowalski({
                                      player: actualPlayer
                                  }),
                            countsTowardsLimit: true
                        });
                    }
                    break;
                case SetPlayEnumType.Taktyczna:
                    modifiers.push({
                        name: SET_PLAY_SHORT_LABELS[setPlay.type],
                        points: slot.isReserve
                            ? 0
                            : calculateTaktyczna({ player: actualPlayer }),
                        countsTowardsLimit: true
                    });
                    break;
                case SetPlayEnumType.Awatar:
                    if (
                        setPlay.userData.replacedPlayerId === player.playerId &&
                        setPlay.adminData.isDisabled
                    ) {
                        modifiers.push({
                            name: `${SET_PLAY_SHORT_LABELS[setPlay.type]}${DISABLED_SET_PLAY_COMMENT_SUFFIX}`,
                            points: 0,
                            countsTowardsLimit: false
                        });
                    }
                    break;
                case SetPlayEnumType.Rezerwa:
                case SetPlayEnumType.RezerwaGielda:
                case SetPlayEnumType.Muchomor:
                case SetPlayEnumType.PijanyCieslak:
                case SetPlayEnumType.BrudnaPala:
                case SetPlayEnumType.PauloSousa:
                case SetPlayEnumType.Typer:
                case SetPlayEnumType.KoloFortunyNorbiego:
                    break;
            }
        }
        let allowance = MAX_PLAYER_MODIFIER_POINTS;
        const comments: string[] = [];
        for (const modifier of modifiers) {
            const credited = modifier.countsTowardsLimit
                ? Math.min(allowance, modifier.points)
                : modifier.points;
            if (modifier.countsTowardsLimit) {
                allowance -= credited;
            }
            player.setPlay += credited;
            const points =
                credited === modifier.points
                    ? `${modifier.name === slot.replacementNames.join('/') && credited > 0 ? '+' : ''}${credited}`
                    : `${credited}/${modifier.points} (limit ${MAX_PLAYER_MODIFIER_POINTS})`;
            comments.push(
                modifier.name === 'PN (pominięty)'
                    ? `PN ${points} (pominięty)`
                    : modifier.name ===
                        `${SET_PLAY_SHORT_LABELS[SetPlayEnumType.Awatar]}${DISABLED_SET_PLAY_COMMENT_SUFFIX}`
                      ? `${SET_PLAY_SHORT_LABELS[SetPlayEnumType.Awatar]} ${points}${DISABLED_SET_PLAY_COMMENT_SUFFIX}`
                      : `${modifier.name} ${points}`
            );
        }
        player.comment = comments.join(', ');
    });
    const unusedReserves = teamData.setPlayList.flatMap(setPlay => {
        const name =
            setPlay.type === SetPlayEnumType.Rezerwa ||
            setPlay.type === SetPlayEnumType.RezerwaGielda
                ? SET_PLAY_SHORT_LABELS[setPlay.type]
                : null;
        return name &&
            !params.slots.some(slot => slot.replacementNames.includes(name))
            ? [`${name} 0`]
            : [];
    });
    const trainerComments = [...unusedReserves];
    for (const setPlay of teamData.setPlayList) {
        let points: number;
        switch (setPlay.type) {
            case SetPlayEnumType.BrudnaPala:
                points = calculateBrudnaPala({ setPlay });
                break;
            case SetPlayEnumType.Typer: {
                const player = [
                    ...params.spartacusSlots,
                    ...params.opponentSpartacusSlots
                ].find(slot => {
                    return slot.nominalPlayerId === setPlay.userData.playerId;
                })?.player;
                if (!player) {
                    throw new Error(
                        `Missing Typer player: ${setPlay.userData.playerId}`
                    );
                }
                points = calculateTyper({ setPlay, player });
                break;
            }
            case SetPlayEnumType.Muchomor:
                if (!params.includeCompetitiveAwards) {
                    continue;
                }
                points = calculateMuchomor({ players: opponentActualPlayers });
                break;
            case SetPlayEnumType.PauloSousa:
                if (!params.includeCompetitiveAwards) {
                    continue;
                }
                points = calculatePauloSousa({
                    players: actualPlayers,
                    opponentPlayers: opponentActualPlayers
                });
                break;
            case SetPlayEnumType.PijanyCieslak:
                if (!params.includeCompetitiveAwards) {
                    continue;
                }
                points = calculatePijanyCieslak({
                    trainerScore: getTrainerHeatTotal({
                        trainer: team.trainer
                    }),
                    opponentTrainerScore: getTrainerHeatTotal({
                        trainer: opponentTrainer
                    })
                });
                break;
            default:
                continue;
        }
        team.trainer.setPlay += points;
        const isDisabled =
            setPlay.type === SetPlayEnumType.BrudnaPala &&
            setPlay.adminData?.isDisabled;
        trainerComments.push(
            `${SET_PLAY_SHORT_LABELS[setPlay.type]} ${points}${isDisabled ? DISABLED_SET_PLAY_COMMENT_SUFFIX : ''}`
        );
    }

    team.trainer.comment = trainerComments.join(', ');

    return team;
}

export function calculateMatchScores(
    params: CalculateMatchScoresParamsType
): CalculateMatchScoresReturnType {
    const seasonStage = params.seasonStage ?? 'regularSeason';
    const nominalOne = prepareTeam(params.teamOne);
    const nominalTwo = prepareTeam(params.teamTwo);
    const spartacusSlotsOne = generateStartingLineupMatrix({
        teamData: params.teamOne,
        nominal: nominalOne
    });
    const spartacusSlotsTwo = generateStartingLineupMatrix({
        teamData: params.teamTwo,
        nominal: nominalTwo
    });
    const slotsOne = selectReserveLineup({
        teamData: params.teamOne,
        nominal: nominalOne,
        slots: spartacusSlotsOne,
        opponentSpartacusSlots: spartacusSlotsTwo,
        seasonStage,
        roundNumber: params.roundNumber
    });
    const slotsTwo = selectReserveLineup({
        teamData: params.teamTwo,
        nominal: nominalTwo,
        slots: spartacusSlotsTwo,
        opponentSpartacusSlots: spartacusSlotsOne,
        seasonStage,
        roundNumber: params.roundNumber
    });
    const teamOne = calculateTeamScore({
        teamData: params.teamOne,
        nominal: nominalOne,
        spartacusSlots: spartacusSlotsOne,
        slots: slotsOne,
        opponentSlots: slotsTwo,
        opponentSpartacusSlots: spartacusSlotsTwo,
        opponentTeamData: params.teamTwo,
        seasonStage,
        roundNumber: params.roundNumber,
        includeCompetitiveAwards: true
    });
    const teamTwo = calculateTeamScore({
        teamData: params.teamTwo,
        nominal: nominalTwo,
        spartacusSlots: spartacusSlotsTwo,
        slots: slotsTwo,
        opponentSlots: slotsOne,
        opponentSpartacusSlots: spartacusSlotsOne,
        opponentTeamData: params.teamOne,
        seasonStage,
        roundNumber: params.roundNumber,
        includeCompetitiveAwards: true
    });
    const scoreDifference = getTeamTotal(teamOne) - getTeamTotal(teamTwo);
    for (const entry of [
        { teamData: params.teamOne, team: teamOne },
        { teamData: params.teamTwo, team: teamTwo }
    ]) {
        for (const setPlay of entry.teamData.setPlayList) {
            if (setPlay.type !== SetPlayEnumType.KoloFortunyNorbiego) {
                continue;
            }
            const points = calculateKoloFortunyNorbiego({
                setPlay,
                scoreDifference
            });
            entry.team.trainer.setPlay += points;
            entry.team.trainer.comment = [
                entry.team.trainer.comment,
                `${SET_PLAY_SHORT_LABELS[setPlay.type]} ${points}`
            ]
                .filter(Boolean)
                .join(', ');
        }
    }
    return {
        teamOne,
        teamTwo,
        teamOneScore: Math.max(0, getTeamTotal(teamOne)),
        teamTwoScore: Math.max(0, getTeamTotal(teamTwo))
    };
}
