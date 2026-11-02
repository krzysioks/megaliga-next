import type {
    CalculateReplacementParamsType,
    CalculateRemisParamsType,
    CalculateMortalKombatComboParamsType,
    CalculatePlayerParamsType,
    CalculateSpartacusParamsType,
    SetPlayCalculationParamsType
} from '@/db/db.types';

import {
    CALCULATION_HEAT_KEYS,
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
