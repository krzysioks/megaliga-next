import 'server-only';

import type { Metadata } from 'next';

import { CmsDemo } from '@/components/cms-demo';

export function generateMetadata(): Metadata {
    return { title: 'Edytor treści', description: 'Edytor treści Megaligi.' };
}

export default function Page() {
    return <CmsDemo />;
}
