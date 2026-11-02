import type {
    CalculateReplacementParamsType,
    CalculateMuchomorParamsType,
    GetWinningStartCountParamsType,
    CalculatePauloSousaParamsType,
    CalculatePijanyCieslakParamsType,
    CalculateBrudnaPalaParamsType,
    CalculateKoloFortunyNorbiegoParamsType,
    CalculateRemisParamsType,
    CalculateMortalKombatComboParamsType,
    CalculatePlayerParamsType,
    CalculateSpartacusParamsType,
    SetPlayCalculationParamsType
} from '@/db/db.types';

import {
    CALCULATION_HEAT_KEYS,
    MUCHOMOR_ZERO_COUNT, MUCHOMOR_POINTS, PIJANY_CIESLAK_POINTS,
    PAULO_SOUSA_POINTS, TYPER_START_COUNT, TYPER_POINTS, WINNING_RACE_POINTS,
    BRUDNA_PALA_POINTS, KFN_FIRST_INTERVAL, KFN_INTERVAL_WIDTH, KFN_POINTS, ORDINARY_RACE_BONUS,
    GUARANTEED_START_COUNT,
    MAX_MORTAL_KOMBAT_COMBO_POINTS,
    MAX_RYSZARD_KOWALSKI_POINTS,
    NCD_POINTS,
    NCD6_CORRECT_POINTS,
    NCD6_INCORRECT_POINTS,
    REMIS_POINTS,
    RYSZARD_KOWALSKI_POINTS,
    SPARTACUS_MIN_AVERAGE_DIFFERENCE,
    SPARTACUS_POINTS,
    TACTICAL_START_INDEX
} from '@/db/db.constants';
import { SetPlayEnumType } from '@/db/models/schema.types';
import { getActualHeats, getPlayerTotal } from '@/db/player-scores.utils';

export function calculateGwarancjaStartow(params: CalculatePlayerParamsType) {
    const actual = getActualHeats(params);
    const last = actual[actual.length - 1];
    const virtualHeats = last
        ? Array.from(
              { length: Math.max(0, GUARANTEED_START_COUNT - actual.length) },
              () => ({ ...last, isNominated: false })
          )
        : [];
    return {
        virtualHeats,
        points: virtualHeats.reduce(
            (total, heat) => total + (heat.value ?? 0),
            0
        )
    };
}

export function calculateRemis(
    params: CalculateRemisParamsType
): number {
    if (!params.setPlay.adminData) {
        throw new Error('Remis admin data is required for score calculation');
    }
    const isMatchDraw =
        params.isMatchDraw ?? params.setPlay.adminData[params.player.playerId];
    return isMatchDraw ? REMIS_POINTS : 0;
}

export function calculateMortalKombatCombo(
    params: CalculateMortalKombatComboParamsType
): number {
    return Math.min(params.liderPoints, MAX_MORTAL_KOMBAT_COMBO_POINTS);
}

export function calculateNcd(
    params: SetPlayCalculationParamsType<SetPlayEnumType.Ncd>
): number {
    if (!params.setPlay.adminData) {
        throw new Error('NCD admin data is required for score calculation');
    }
    return params.setPlay.adminData.playerIdList.includes(
        params.player.playerId
    )
        ? NCD_POINTS
        : 0;
}

export function calculateNcd6(
    params: SetPlayCalculationParamsType<SetPlayEnumType.Ncd6>
): number {
    if (!params.setPlay.adminData) {
        throw new Error('NCD6 admin data is required for score calculation');
    }
    return params.setPlay.adminData.playerIdList.includes(
        params.player.playerId
    )
        ? NCD6_CORRECT_POINTS
        : NCD6_INCORRECT_POINTS;
}

export function calculateSpartacus(
    params: CalculateSpartacusParamsType
): number {
    const ownAverage = params.ownAverage;
    const opponentAverage = params.opponentAverage;
    const ownTotal = getPlayerTotal(params);
    const opponentTotal = getPlayerTotal({ player: params.opponentPlayer });
    return opponentAverage -
            ownAverage +
            Number.EPSILON *
                Math.max(1, Math.abs(ownAverage), Math.abs(opponentAverage)) >=
            SPARTACUS_MIN_AVERAGE_DIFFERENCE &&
        ownTotal > opponentTotal
        ? SPARTACUS_POINTS
        : 0;
}

export function calculateRyszardKowalski(
    params: CalculatePlayerParamsType
): number {
    const hits = CALCULATION_HEAT_KEYS.filter(
        key => params.player[key].value === 1 && !params.player[key].bonus
    ).length;
    return Math.min(
        hits * RYSZARD_KOWALSKI_POINTS,
        MAX_RYSZARD_KOWALSKI_POINTS
    );
}

export function calculateTaktyczna(params: CalculatePlayerParamsType): number {
    const actual = getActualHeats(params);
    return actual[TACTICAL_START_INDEX]?.value ?? 0;
}

export function calculateReplacement(params: CalculateReplacementParamsType) {
    if (
        CALCULATION_HEAT_KEYS.some(
            key => params.scores[key]?.value === undefined
        )
    ) {
        throw new Error(
            `Missing replacement heat data for player: ${params.playerId}`
        );
    }
    const scores = Object.fromEntries(
        CALCULATION_HEAT_KEYS.map(key => [
            key,
            structuredClone(params.scores[key])
        ])
    );
    return {
        ...params.player,
        ...scores,
        playerId: params.playerId,
        isJunior: params.isJunior
    };
}

export function calculateAwatar(params: CalculateReplacementParamsType) {
    return calculateReplacement(params);
}

export function calculateMuchomor(params: CalculateMuchomorParamsType): number {
    const zeros = params.players.reduce((count, player) => {
        return count + getActualHeats({ player }).filter(heat => heat.value === 0).length;
    }, 0);
    return zeros >= MUCHOMOR_ZERO_COUNT ? MUCHOMOR_POINTS : 0;
}

export function calculateBrudnaPala(params: CalculateBrudnaPalaParamsType): number {
    if (!params.setPlay.adminData) {
        throw new Error('Brudna Pała admin data is required for score calculation');
    }
    if (params.setPlay.adminData.isDisabled) {
        return 0;
    }
    const hits = Object.values(params.setPlay.adminData.playerResults).filter(Boolean).length;
    return BRUDNA_PALA_POINTS[hits];
}

export function calculateTyper(params: SetPlayCalculationParamsType<SetPlayEnumType.Typer>): number {
    const heats = getActualHeats(params).slice(0, TYPER_START_COUNT);
    if (heats.length === 0) {
        return 0;
    }
    const actual = heats.reduce((total, heat) => {
        return total + (heat.value ?? 0) - (heat.bonus ? ORDINARY_RACE_BONUS : 0);
    }, 0);
    const attempts = [params.setPlay.userData.attemptOne, params.setPlay.userData.attemptTwo];
    return attempts.some(attempt => Object.values(attempt).reduce((total, value) => total + value, 0) === actual)
        ? TYPER_POINTS : 0;
}

export function calculatePijanyCieslak(params: CalculatePijanyCieslakParamsType): number {
    return params.trainerScore > params.opponentTrainerScore ? PIJANY_CIESLAK_POINTS : 0;
}

function getWinningStartCount(params: GetWinningStartCountParamsType): number {
    return params.players.reduce((total, player) => {
        return total + getActualHeats({ player }).filter(heat => {
            return heat.value === WINNING_RACE_POINTS;
        }).length;
    }, 0);
}

export function calculatePauloSousa(params: CalculatePauloSousaParamsType): number {
    return getWinningStartCount({ players: params.players }) > getWinningStartCount({ players: params.opponentPlayers })
        ? PAULO_SOUSA_POINTS : 0;
}

export function calculateKoloFortunyNorbiego(params: CalculateKoloFortunyNorbiegoParamsType): number {
    const minimum = params.setPlay.userData.minimum;
    const maximum = params.setPlay.userData.maximum;
    const isFirstInterval = minimum === KFN_FIRST_INTERVAL.minimum && maximum === KFN_FIRST_INTERVAL.maximum;
    const isLaterInterval = minimum >= KFN_FIRST_INTERVAL.maximum &&
        (minimum - KFN_FIRST_INTERVAL.maximum) % KFN_INTERVAL_WIDTH === 0 &&
        maximum === minimum + KFN_INTERVAL_WIDTH;
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || (!isFirstInterval && !isLaterInterval)) {
        throw new Error(`Invalid KFN interval: ${minimum}-${maximum}`);
    }
    const margin = Math.abs(params.scoreDifference);
    return margin > 0 && margin >= minimum && margin <= maximum ? KFN_POINTS : 0;
}
