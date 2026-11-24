import 'server-only';

import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { PageHeading } from '@/components/page-heading';
import { HISTORY_YEARS } from '@/constants/site-navigation.constants';

type HistoryPageProps = { params: Promise<{ year: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
    return HISTORY_YEARS.map(year => ({ year }));
}

async function getHistoryYear(params: HistoryPageProps['params']) {
    const { year } = await params;

    if (!HISTORY_YEARS.includes(year)) {
        notFound();
    }

    return year;
}

export async function generateMetadata({
    params
}: HistoryPageProps): Promise<Metadata> {
    const year = await getHistoryYear(params);

    return {
        title: `Historia – ${year}`,
        description: `Archiwum rozgrywek Megaligi z sezonu ${year}.`
    };
}

export default async function HistoryPage({ params }: HistoryPageProps) {
    const year = await getHistoryYear(params);

    return <PageHeading>{`Historia – ${year}`}</PageHeading>;
}
