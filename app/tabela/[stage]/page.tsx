import 'server-only';

import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { PageHeading } from '@/components/page-heading';
import { RESULT_STAGES } from '@/constants/site-navigation.constants';

type StandingsPageProps = { params: Promise<{ stage: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
    return RESULT_STAGES.map(stage => ({ stage: stage.slug }));
}

async function getStandingsTitle(params: StandingsPageProps['params']) {
    const { stage } = await params;
    const resultStage = RESULT_STAGES.find(item => item.slug === stage);

    if (!resultStage) {
        notFound();
    }

    return `Tabela – ${resultStage.title}`;
}

export async function generateMetadata({
    params
}: StandingsPageProps): Promise<Metadata> {
    const title = await getStandingsTitle(params);

    return { title, description: `${title}. Klasyfikacja drużyn w Megalidze.` };
}

export default async function StandingsPage({ params }: StandingsPageProps) {
    return <PageHeading>{await getStandingsTitle(params)}</PageHeading>;
}
