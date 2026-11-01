import type { CalculatePlayerParamsType } from '@/db/db.types';

import { CALCULATION_HEAT_KEYS } from '@/db/db.constants';

export function getActualHeats(params: CalculatePlayerParamsType) {
    return CALCULATION_HEAT_KEYS.map(key => params.player[key]).filter(
        heat => heat.value !== null
    );
}

export function getPlayerTotal(params: CalculatePlayerParamsType) {
    return getActualHeats(params).reduce(
        (total, heat) => total + (heat.value ?? 0),
        0
    );
}

