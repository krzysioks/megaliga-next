import type {
    CalculateKapitanParamsType,
    CalculateMatchScoresParamsType,
    CalculateMatchScoresReturnType,
    CalculatePlayerParamsType,
    CalculatePrimusNominatusParamsType,
    CalculateTrainerParamsType,
    CalculationTeamReturnType,
    CalculationTeamType,
    ScoreModifierType
} from '@/db/db.types';

import {
    CALCULATION_HEAT_KEYS,
    KAPITAN_POINTS,
    LIDER_FIRST_POINT_TOTAL,
    MAX_LIDER_POINTS,
    MAX_PLAYER_MODIFIER_POINTS,
    ORDINARY_RACE_BONUS,
    STARTING_LINEUP_POSITION_KEYS,
    FIFTH_PLAYER_INDEX
} from '@/db/db.constants';
import { SetPlayEnumType } from '@/db/models/schema.types';
import { getActualHeats, getPlayerTotal } from '@/db/player-scores.utils';
import {
    calculateGwarancjaStartow,
    calculateRemis,
    calculateMortalKombatCombo,
    calculateNcd,
    calculateNcd6,
    calculateSpartacus,
    calculateRyszardKowalski,
    calculateTaktyczna
} from '@/db/set-plays.utils';

function getTeamTotal(params: CalculationTeamReturnType) {
    return (
        params.players.reduce((total, player) => {
            return total + getPlayerTotal({ player }) + player.setPlay;
        }, 0) +
        CALCULATION_HEAT_KEYS.reduce(
            (total, key) => total + params.trainer[key],
            0
        ) +
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
    return getPlayerTotal(params) > getPlayerTotal({ player: params.opponent })
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

export function calculateMatchScores(
    params: CalculateMatchScoresParamsType
): CalculateMatchScoresReturnType {
    const teamOne = prepareTeam(params.teamOne);
    const teamTwo = prepareTeam(params.teamTwo);

    const effectiveTeams = [teamOne, teamTwo].map((team, index) => {
        const source = index === 0 ? params.teamOne : params.teamTwo;
        const players = structuredClone(team.players);
        for (const setPlay of source.setPlayList) {
            if (setPlay.type !== SetPlayEnumType.GwarancjaStartow) {
                continue;
            }
            const player = players.find(
                entry => entry.playerId === setPlay.userData.playerId
            );
            if (!player) {
                throw new Error(
                    `Selected player is not in starting lineup: ${setPlay.userData.playerId}`
                );
            }
            const { virtualHeats } = calculateGwarancjaStartow({ player });
            const emptyKeys = CALCULATION_HEAT_KEYS.filter(
                key => player[key].value === null
            );
            virtualHeats.forEach((heat, heatIndex) => {
                player[emptyKeys[heatIndex]] = heat;
            });
        }
        team.trainer.heatFive = players[FIFTH_PLAYER_INDEX].heatFive.value ?? 0;
        return players;
    });

    for (const [teamIndex, team] of [teamOne, teamTwo].entries()) {
        const source = teamIndex === 0 ? params.teamOne : params.teamTwo;
        const opponent = teamIndex === 0 ? teamTwo : teamOne;
        const effectivePlayers = effectiveTeams[teamIndex];
        const opponentEffectivePlayers =
            teamIndex === 0 ? effectiveTeams[1] : effectiveTeams[0];

        for (const setPlay of source.setPlayList) {
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
                !team.players.some(player => player.playerId === targetId)
            ) {
                throw new Error(
                    `Selected player is not in starting lineup: ${targetId}`
                );
            }
        }

        const roles = source.startingLineup.roles;

        for (const rolePlayerId of [roles.pn.playerId, roles.kb, roles.p]) {
            if (
                !team.players.some(player => player.playerId === rolePlayerId)
            ) {
                throw new Error(
                    `Role player is not in starting lineup: ${rolePlayerId}`
                );
            }
        }

        team.players.forEach((player, index) => {
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
                    points: calculateJoker({ player }),
                    countsTowardsLimit: true
                });
            } else if (index === 2) {
                modifiers.push({
                    name: 'Kapitan',
                    points: calculateKapitan({
                        player: effectivePlayer,
                        opponent: opponentEffectivePlayers[index]
                    }),
                    countsTowardsLimit: true
                });
            }
            if (player.playerId === roles.pn.playerId) {
                modifiers.push({
                    name: roles.pn.isDisabled ? 'PN (pominięty)' : 'PN',
                    points: calculatePrimusNominatus({
                        player,
                        isDisabled: roles.pn.isDisabled
                    }),
                    countsTowardsLimit: true
                });
            }
            if (player.playerId === roles.kb) {
                modifiers.push({
                    name: 'KB',
                    points: calculateKrolBonusow({ player: effectivePlayer }),
                    countsTowardsLimit: true
                });
            }
            if (player.playerId === roles.p) {
                modifiers.push({
                    name: 'P',
                    points: calculatePrzelozony({ player }),
                    countsTowardsLimit: true
                });
            }
            for (const setPlay of source.setPlayList) {
                switch (setPlay.type) {
                    case SetPlayEnumType.GwarancjaStartow:
                        if (setPlay.userData.playerId === player.playerId) {
                            modifiers.push({
                                name: 'GS',
                                points: calculateGwarancjaStartow({ player })
                                    .points,
                                countsTowardsLimit: true
                            });
                        }
                        break;
                    case SetPlayEnumType.Remis:
                        modifiers.push({
                            name: 'Remis',
                            points: calculateRemis({ setPlay, player }),
                            countsTowardsLimit: true
                        });
                        break;
                    case SetPlayEnumType.MortalKombatCombo:
                        if (index === 0) {
                            modifiers.push({
                                name: 'MKC',
                                points: calculateMortalKombatCombo({
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
                                name:
                                    setPlay.type === SetPlayEnumType.Ncd
                                        ? 'NCD'
                                        : 'NCD6',
                                points:
                                    setPlay.type === SetPlayEnumType.Ncd
                                        ? calculateNcd({ setPlay, player })
                                        : calculateNcd6({ setPlay, player }),
                                countsTowardsLimit:
                                    setPlay.type === SetPlayEnumType.Ncd
                            });
                        }
                        break;
                    case SetPlayEnumType.Spartacus:
                        if (setPlay.userData.ownPlayerId === player.playerId) {
                            const opponentPlayer = opponent.players.find(
                                entry =>
                                    entry.playerId ===
                                    setPlay.userData.opponentPlayerId
                            );
                            if (!opponentPlayer) {
                                throw new Error(
                                    `Missing Spartacus opponent: ${setPlay.userData.opponentPlayerId}`
                                );
                            }
                            modifiers.push({
                                name: 'Spartacus',
                                points: calculateSpartacus({
                                    setPlay,
                                    player,
                                    opponent: opponentPlayer,
                                    roundNumber: params.roundNumber
                                }),
                                countsTowardsLimit: true
                            });
                        }
                        break;
                    case SetPlayEnumType.RyszardKowalski:
                        if (setPlay.userData.playerId === player.playerId) {
                            modifiers.push({
                                name: 'RK',
                                points: calculateRyszardKowalski({ player }),
                                countsTowardsLimit: true
                            });
                        }
                        break;
                    case SetPlayEnumType.Taktyczna:
                        modifiers.push({
                            name: 'Taktyczna',
                            points: calculateTaktyczna({ player }),
                            countsTowardsLimit: true
                        });
                        break;
                    case SetPlayEnumType.Rezerwa:
                    case SetPlayEnumType.RezerwaGielda:
                    case SetPlayEnumType.Muchomor:
                    case SetPlayEnumType.PijanyCieslak:
                    case SetPlayEnumType.BrudnaPala:
                    case SetPlayEnumType.PauloSousa:
                    case SetPlayEnumType.Typer:
                    case SetPlayEnumType.Awatar:
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
                        ? `${credited}`
                        : `${credited}/${modifier.points} (limit ${MAX_PLAYER_MODIFIER_POINTS})`;
                comments.push(
                    modifier.name === 'PN (pominięty)'
                        ? `PN ${points} (pominięty)`
                        : `${modifier.name} ${points}`
                );
            }
            player.comment = comments.join(', ');
        });
    }
    return {
        teamOne,
        teamTwo,
        teamOneScore: Math.max(0, getTeamTotal(teamOne)),
        teamTwoScore: Math.max(0, getTeamTotal(teamTwo))
    };
}
