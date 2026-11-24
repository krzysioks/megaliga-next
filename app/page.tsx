import 'server-only';

import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { SITE_PAGES } from '@/constants/site-navigation.constants';

export function generateMetadata(): Metadata {
    const { description, title } = SITE_PAGES.trybuna;

    return { description, title };
}

export default function Home() {
    redirect(SITE_PAGES.trybuna.href);
}
