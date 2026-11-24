'use client';

import type { MobileNavigationSheetProps } from '@/components/mobile-navigation-sheet/mobile-navigation-sheet.types';

import { useMobileNavigationSheet } from '@/components/mobile-navigation-sheet/batons/use-mobile-navigation-sheet';
import { Sheet } from '@/components/ui/sheet';

export default function MobileNavigationSheet(
    props: MobileNavigationSheetProps
) {
    const { children } = props;
    const { isOpen, setIsOpen } = useMobileNavigationSheet();

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            {children}
        </Sheet>
    );
}
