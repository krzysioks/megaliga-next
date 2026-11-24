import 'server-only';

import { ChevronRight } from 'lucide-react';
import Image from 'next/image';

import { MobileNavigationLink } from '@/components/mobile-navigation-link';
import { MobileNavigationSheet } from '@/components/mobile-navigation-sheet';
import { Button } from '@/components/ui/button';
import {
    SheetClose,
    SheetContent,
    SheetTitle,
    SheetTrigger
} from '@/components/ui/sheet';
import {
    SITE_ICONS,
    SITE_NAVIGATION
} from '@/constants/site-navigation.constants';

const navigationItemClassName =
    'flex min-h-11 items-center justify-between rounded-sm text-primary underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:underline';

export default function MobileNavigation() {
    return (
        <MobileNavigationSheet>
            <SheetTrigger asChild>
                <Button
                    aria-label="Otwórz menu"
                    className="lg:hidden"
                    size="icon"
                    type="button"
                    variant="ghost"
                >
                    <Image
                        src={SITE_ICONS.menu}
                        alt=""
                        width={28}
                        height={28}
                    />
                </Button>
            </SheetTrigger>

            <SheetContent
                aria-describedby={undefined}
                className="h-dvh w-full gap-6 border-none bg-sheet px-6 pt-4 pb-6 sm:max-w-none"
                showCloseButton={false}
                side="left"
            >
                <div className="flex items-center justify-between">
                    <SheetTitle className="font-bold text-primary">
                        Menu
                    </SheetTitle>
                    <SheetClose asChild>
                        <Button
                            aria-label="Zamknij menu"
                            size="icon"
                            type="button"
                            variant="ghost"
                        >
                            <Image
                                src={SITE_ICONS.close}
                                alt=""
                                width={24}
                                height={24}
                            />
                        </Button>
                    </SheetClose>
                </div>

                <nav
                    aria-label="Menu główne"
                    className="min-h-0 overflow-y-auto p-1"
                >
                    <ul className="space-y-1 font-semibold lowercase">
                        {SITE_NAVIGATION.map(item => {
                            if ('href' in item) {
                                return (
                                    <li key={item.title}>
                                        <MobileNavigationLink
                                            className={`${navigationItemClassName} hover:text-secondary`}
                                            href={item.href}
                                        >
                                            {item.title}
                                            <ChevronRight
                                                aria-hidden="true"
                                                size={16}
                                            />
                                        </MobileNavigationLink>
                                    </li>
                                );
                            }

                            return (
                                <li key={item.title}>
                                    <details className="group">
                                        <summary
                                            className={`cursor-pointer list-none ${navigationItemClassName} hover:text-secondary`}
                                        >
                                            {item.title}
                                            <ChevronRight
                                                aria-hidden="true"
                                                className="group-open:rotate-90"
                                                size={16}
                                            />
                                        </summary>
                                        <div className="space-y-4 py-2 pl-6 text-sm normal-case">
                                            {item.sections.map(section => {
                                                const title =
                                                    'title' in section
                                                        ? section.title
                                                        : null;

                                                return (
                                                    <div
                                                        key={
                                                            title ?? item.title
                                                        }
                                                    >
                                                        {title && (
                                                            <p className="font-bold text-primary text-white">
                                                                {title}
                                                            </p>
                                                        )}
                                                        <ul>
                                                            {section.links.map(link => {
                                                                return (
                                                                    <li key={link.href}>
                                                                        <MobileNavigationLink
                                                                            className={`${navigationItemClassName} hover:text-submenu-hover`}
                                                                            href={link.href}
                                                                        >
                                                                            {link.title}
                                                                        </MobileNavigationLink>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </details>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </SheetContent>
        </MobileNavigationSheet>
    );
}
