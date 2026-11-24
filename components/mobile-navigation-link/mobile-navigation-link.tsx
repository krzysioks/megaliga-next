'use client';

import type { MobileNavigationLinkProps } from '@/components/mobile-navigation-link/mobile-navigation-link.types';

import Link from 'next/link';

import { useMobileNavigationLink } from '@/components/mobile-navigation-link/batons/use-mobile-navigation-link';
import { SheetClose } from '@/components/ui/sheet';

export default function MobileNavigationLink(props: MobileNavigationLinkProps) {
    const { children, className, href } = props;
    const { isActive } = useMobileNavigationLink(href);

    return (
        <SheetClose asChild>
            <Link
                aria-current={isActive ? 'page' : undefined}
                className={className}
                href={href}
            >
                {children}
            </Link>
        </SheetClose>
    );
}
