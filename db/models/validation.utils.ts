import type { SetPlayPayloadType } from '@/db/models/games/set-plays-data';

import { z } from 'zod';

import { MAX_SET_PLAYS_PER_ROUND } from '@/db/db.constants';
import { getSetPlaySelectionLimit } from '@/db/db.utils';
import { SetPlayEnumType } from '@/db/models/schema.types';


export const validateDate = (value: string) => {
    if (!value) {
        return false;
    }

    const [day, month, year] = value.split('-');

    const d = new Date(`${year}-${month}-${day}`);

    if (
        d &&
        d.getMonth() + 1 === Number(month) &&
        d.getDate() === Number(day) &&
        d.getFullYear() === Number(year)
    ) {
        return true;
    }

    return false;
};

export function validateSetPlayConstraints(
    setPlayList: Pick<SetPlayPayloadType, 'type'>[]
): SetPlayEnumType[] {
    if (setPlayList.length >= MAX_SET_PLAYS_PER_ROUND) {
        return [];
    }

    return Object.values(SetPlayEnumType).filter(type => {
        const count = setPlayList.filter(play => play.type === type).length;
        return count < getSetPlaySelectionLimit(type);
    });
}

export function validateSetPlays(
    plays: Pick<SetPlayPayloadType, 'type'>[],
    context: z.RefinementCtx
) {
    const counts = new Map<SetPlayEnumType, number>();
    plays.forEach((play, index) => {
        const count = (counts.get(play.type) ?? 0) + 1;
        counts.set(play.type, count);
        const maximum = getSetPlaySelectionLimit(play.type);
        if (count > maximum) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: [index, 'type'],
                message: `${play.type} may be selected at most ${maximum} time(s) per round`
            });
        }
    });
}
