import {
    MAX_PLAYOFF_ROUND,
    MAX_REGULAR_SEASON_ROUND,
    MIN_PLAYOFF_ROUND,
    MIN_REGULAR_SEASON_ROUND
} from '@/db/db.constants';

const FIRST_HISTORY_YEAR = 2018;
const LAST_HISTORY_YEAR = 2026;

export const SITE_NAME = 'Megaliga.NEXT';
export const SITE_DESCRIPTION = 'Megaliga.NEXT – żużlowa liga fantasy.';

export const SITE_PAGES = {
    trybuna: {
        href: '/trybuna',
        title: 'Trybuna',
        description:
            'Aktualności i ogłoszenia z żużlowej ligi fantasy Megaliga.'
    },
    zasady: {
        href: '/zasady',
        title: 'Zasady',
        description: 'Regulamin Megaligi i zasady punktacji.'
    },
    statystyki: {
        href: '/statystyki',
        title: 'Statystyki',
        description: 'Statystyki zawodników i zagrywek w Megalidze.'
    },
    druzyny: {
        href: '/druzyny',
        title: 'Drużyny',
        description: 'Drużyny uczestniczące w Megalidze.'
    },
    dashboard: {
        href: '/dashboard',
        title: 'Dashboard',
        description: 'Panel użytkownika Megaligi.'
    }
} as const;

export const RESULT_STAGES = [
    {
        slug: 'megaliga',
        title: 'Megaliga',
        rounds: Array.from(
            { length: MAX_REGULAR_SEASON_ROUND - MIN_REGULAR_SEASON_ROUND + 1 },
            (_, index) => String(MIN_REGULAR_SEASON_ROUND + index)
        )
    },
    {
        slug: 'playoffs',
        title: 'Playoffs',
        rounds: Array.from(
            { length: MAX_PLAYOFF_ROUND - MIN_PLAYOFF_ROUND + 1 },
            (_, index) => String(MIN_PLAYOFF_ROUND + index)
        )
    }
] as const;

export const HISTORY_YEARS = Array.from(
    { length: LAST_HISTORY_YEAR - FIRST_HISTORY_YEAR + 1 },
    (_, index) => String(LAST_HISTORY_YEAR - index)
);

const STANDINGS_LINKS = RESULT_STAGES.map(stage => {
    return {
        title: stage.title,
        href: `/tabela/${stage.slug}`
    };
});

export const SITE_NAVIGATION = [
    SITE_PAGES.trybuna,
    SITE_PAGES.zasady,
    {
        title: 'Tabela',
        sections: [{ links: STANDINGS_LINKS }]
    },
    {
        title: 'Wyniki',
        sections: RESULT_STAGES.map(stage => {
            return {
                title: stage.title,
                links: stage.rounds.map(round => {
                    return {
                        title: `Kolejka ${round}`,
                        href: `/wyniki/${stage.slug}/kolejka/${round}`
                    };
                })
            };
        })
    },
    SITE_PAGES.statystyki,
    SITE_PAGES.druzyny,
    {
        title: 'Historia',
        sections: [
            {
                links: HISTORY_YEARS.map(year => {
                    return {
                        title: year,
                        href: `/historia/${year}`
                    };
                })
            }
        ]
    }
] as const;

export const SITE_ICONS = {
    logo: '/logo_v5_www_2.svg',
    dashboard: '/team_dashboard_24dp_FFE70C_FILL0_wght400_GRAD0_opsz24.svg',
    account: '/account_circle_24dp_FFE70C_FILL0_wght400_GRAD0_opsz24.svg',
    menu: '/menu_24dp_FFE70C_FILL0_wght400_GRAD0_opsz24.svg',
    close: '/close_24dp_FFE70C_FILL0_wght400_GRAD0_opsz24.svg'
} as const;
