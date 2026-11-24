import 'server-only';

import type { Metadata } from 'next';

import { PageHeading } from '@/components/page-heading';
import { SITE_PAGES } from '@/constants/site-navigation.constants';

const { description, title } = SITE_PAGES.druzyny;

export function generateMetadata(): Metadata {
    return { description, title };
}

export default function Page() {
    return <PageHeading>{title}</PageHeading>;
}
