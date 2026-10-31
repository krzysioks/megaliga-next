import type {
    CalculateKapitanParamsType,
    CalculateMatchScoresParamsType,
    CalculateMatchScoresReturnType,
    CalculatePlayerParamsType,
    CalculatePrimusNominatusParamsType,
    CalculateTrainerParamsType,
    CalculationTeamReturnType,
    CalculationTeamType
} from '@/db/db.types';

import {
    CALCULATION_HEAT_KEYS,
    KAPITAN_POINTS,
    LIDER_FIRST_POINT_TOTAL,
    MAX_LIDER_POINTS,
    ORDINARY_RACE_BONUS,
    STARTING_LINEUP_POSITION_KEYS
} from '@/db/db.constants';

function getActualHeats(params: CalculatePlayerParamsType) {
    return CALCULATION_HEAT_KEYS.map(key => params.player[key]).filter(
        heat => heat.value !== null
    );
}

function getPlayerTotal(params: CalculatePlayerParamsType) {
    return getActualHeats(params).reduce(
        (total, heat) => total + (heat.value ?? 0),
        0
    );
}

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
        heatFive: params.players[4].heatFive.value ?? 0,
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
    for (const [team, source, opponent] of [
        [teamOne, params.teamOne, teamTwo],
        [teamTwo, params.teamTwo, teamOne]
    ] as const) {
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
            const contributions: string[] = [];
            if (index === 0) {
                const points = calculateLider({ player });
                player.setPlay += points;
                contributions.push(`Lider ${points}`);
            } else if (index === 1) {
                const points = calculateJoker({ player });
                player.setPlay += points;
                contributions.push(`Joker ${points}`);
            } else if (index === 2) {
                const points = calculateKapitan({
                    player,
                    opponent: opponent.players[index]
                });
                player.setPlay += points;
                contributions.push(`Kapitan ${points}`);
            }
            if (player.playerId === roles.pn.playerId) {
                const points = calculatePrimusNominatus({
                    player,
                    isDisabled: roles.pn.isDisabled
                });
                player.setPlay += points;
                contributions.push(
                    `PN ${points}${roles.pn.isDisabled ? ' (pominięty)' : ''}`
                );
            }
            if (player.playerId === roles.kb) {
                const points = calculateKrolBonusow({ player });
                player.setPlay += points;
                contributions.push(`KB ${points}`);
            }
            if (player.playerId === roles.p) {
                const points = calculatePrzelozony({ player });
                player.setPlay += points;
                contributions.push(`P ${points}`);
            }
            player.comment = contributions.join(', ');
        });
    }

    return {
        teamOne,
        teamTwo,
        teamOneScore: Math.max(0, getTeamTotal(teamOne)),
        teamTwoScore: Math.max(0, getTeamTotal(teamTwo))
    };
}
