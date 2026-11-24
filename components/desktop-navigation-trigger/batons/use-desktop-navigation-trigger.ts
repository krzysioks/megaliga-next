'use client';

import type { PointerEvent } from 'react';

import { usePathname } from 'next/navigation';

export const useDesktopNavigationTrigger = (childHrefs: string[]) => {
    const pathname = usePathname();
    const isActive = childHrefs.includes(pathname);

    const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
        // Hover can open a group just before a click toggles it closed.
        event.preventDefault();
    };

    return { handlePointerMove, isActive };
};
