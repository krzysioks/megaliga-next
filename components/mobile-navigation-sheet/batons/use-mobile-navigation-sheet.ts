'use client';

import { useEffect, useState } from 'react';

import { DESKTOP_NAVIGATION_QUERY } from '@/components/mobile-navigation-sheet/mobile-navigation-sheet.constants';

export const useMobileNavigationSheet = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const desktop = window.matchMedia(DESKTOP_NAVIGATION_QUERY);

        const closeOnDesktop = (event: MediaQueryListEvent) => {
            if (event.matches) {
                setIsOpen(false);
            }
        };

        desktop.addEventListener('change', closeOnDesktop);
        return () => desktop.removeEventListener('change', closeOnDesktop);
    }, []);

    return { isOpen, setIsOpen };
};
