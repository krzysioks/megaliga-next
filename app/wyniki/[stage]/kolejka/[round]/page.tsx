import 'server-only';

import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { PageHeading } from '@/components/page-heading';
import { RESULT_STAGES } from '@/constants/site-navigation.constants';

type ResultsPageProps = { params: Promise<{ stage: string; round: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
    return RESULT_STAGES.flatMap(stage => {
        return stage.rounds.map(round => ({ stage: stage.slug, round }));
    });
}

async function getResultsTitle(params: ResultsPageProps['params']) {
    const { stage, round } = await params;
    const resultStage = RESULT_STAGES.find(item => item.slug === stage);

    if (!resultStage || !resultStage.rounds.includes(round)) {
        notFound();
    }

    return `Wyniki – ${resultStage.title} – Kolejka ${round}`;
}

export async function generateMetadata({
    params
}: ResultsPageProps): Promise<Metadata> {
    const title = await getResultsTitle(params);

    return { title, description: `${title}. Rezultaty meczów Megaligi.` };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
    return <PageHeading>{await getResultsTitle(params)}</PageHeading>;
}
