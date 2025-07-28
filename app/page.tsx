'use client';

import React, { JSX } from 'react';

export default function Home(): JSX.Element {
    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
                Megaliga.NEXT
            </main>
            <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
                <span className="flex items-center gap-2 text-sm">
                    <span>&copy;</span>
                    <span>megaliga v.0.0.1</span>
                </span>
            </footer>
        </div>
    );
}
