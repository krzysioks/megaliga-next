import type { SetPlayEnumType } from '@/db/models/schema.types';

export const PLAYER_ROLE_LABELS = [
    ['pn', 'PN'],
    ['kb', 'KB'],
    ['p', 'P']
] as const;

export const SET_PLAY_SHORT_LABELS: Record<SetPlayEnumType, string> = {
    gwarancjaStartow: 'GS',
    koloFortunyNorbiego: 'KFN',
    remis: 'Remis',
    rezerwa: 'Rezerwa',
    rezerwaGielda: 'Rezerwa Giełda',
    mortalKombatCombo: 'MKC',
    muchomor: 'Muchomor',
    ncd: 'NCD',
    ncd6: 'NCD6',
    spartacus: 'Spartacus',
    pijanyCieslak: 'Pijany Cieślak',
    brudnaPala: 'Brudna Pała',
    pauloSousa: 'Paulo Sousa',
    ryszardKowalski: 'Ryszard Kowalski',
    typer: 'Typer',
    taktyczna: 'Taktyczna',
    awatar: 'Awatar'
};
