'use client';

import { usePathname } from 'next/navigation';

export const useMobileNavigationLink = (href: string) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return { isActive };
};
