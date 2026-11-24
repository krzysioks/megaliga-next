'use client';

import type { DesktopNavigationTriggerProps } from '@/components/desktop-navigation-trigger/desktop-navigation-trigger.types';

import { useDesktopNavigationTrigger } from '@/components/desktop-navigation-trigger/batons/use-desktop-navigation-trigger';
import { NavigationMenuTrigger } from '@/components/ui/navigation-menu';

export default function DesktopNavigationTrigger(
    props: DesktopNavigationTriggerProps
) {
    const { childHrefs, title } = props;
    const { handlePointerMove, isActive } =
        useDesktopNavigationTrigger(childHrefs);

    return (
        <NavigationMenuTrigger
            className="block cursor-pointer rounded-sm px-2 py-2 text-primary lowercase underline-offset-4 hover:text-secondary focus-visible:outline-2 focus-visible:outline-ring data-active:underline"
            data-active={isActive || undefined}
            onPointerMove={handlePointerMove}
        >
            {title}
        </NavigationMenuTrigger>
    );
}
