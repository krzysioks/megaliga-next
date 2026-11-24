import 'server-only';

import type { Metadata } from 'next';

import { FormDemo } from '@/components/form-demo';

export function generateMetadata(): Metadata {
    return {
        title: 'Formularz testowy',
        description: 'Formularz testowy Megaligi.'
    };
}

export default function Page() {
    return <FormDemo />;
}
