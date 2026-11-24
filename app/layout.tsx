import 'server-only';

import type { Metadata } from 'next';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import {
    SITE_DESCRIPTION,
    SITE_ICONS,
    SITE_NAME
} from '@/constants/site-navigation.constants';
import { lexend } from '@/styles/fonts';

import '@/styles/globals.css';

export const metadata: Metadata = {
    title: {
        default: SITE_NAME,
        template: `%s | ${SITE_NAME}`
    },
    description: SITE_DESCRIPTION,
    icons: { icon: SITE_ICONS.logo }
};

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pl" className={lexend.variable}>
            <body className="antialiased">
                <div className="relative isolate flex min-h-dvh flex-col">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none fixed inset-0 -z-10 bg-(--site-photo-base)"
                    >
                        <div className="site-background-photo absolute inset-0 bg-cover bg-center bg-no-repeat" />
                        <div className="absolute inset-0 bg-(--site-photo-overlay)" />
                    </div>
                    <Header />
                    <main className="mx-auto w-full max-w-6xl flex-1 px-2 py-8 lg:px-6">
                        {children}
                    </main>
                    <Footer />
                </div>
            </body>
        </html>
    );
}
