'use client';

import type { DesktopNavigationLinkProps } from '@/components/desktop-navigation-link/desktop-navigation-link.types';

import Link from 'next/link';

import { useDesktopNavigationLink } from '@/components/desktop-navigation-link/batons/use-desktop-navigation-link';
import { NavigationMenuLink } from '@/components/ui/navigation-menu';
import { cn } from '@/utils/utils';

export default function DesktopNavigationLink(
    props: DesktopNavigationLinkProps
) {
    const { href, title, isSubmenuLink } = props;
    const { isActive } = useDesktopNavigationLink(href);

    return (
        <NavigationMenuLink
            asChild
            active={isActive}
            className={cn(
                'block rounded-sm px-2 py-2 text-primary underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:underline',
                isSubmenuLink ? 'hover:text-submenu-hover' : 'hover:text-secondary'
            )}
        >
            <Link href={href}>{title}</Link>
        </NavigationMenuLink>
    );
}
