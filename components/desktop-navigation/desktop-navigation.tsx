import 'server-only';

import { DesktopNavigationLink } from '@/components/desktop-navigation-link';
import { DesktopNavigationTrigger } from '@/components/desktop-navigation-trigger';
import { DESKTOP_LINKS_PER_COLUMN } from '@/components/desktop-navigation/desktop-navigation.constants';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuList
} from '@/components/ui/navigation-menu';
import { SITE_NAVIGATION } from '@/constants/site-navigation.constants';

export default function DesktopNavigation() {
    return (
        <NavigationMenu aria-label="Menu główne" className="hidden lg:block">
            <NavigationMenuList className="flex items-center gap-2 text-base font-semibold lowercase xl:gap-3">
                {SITE_NAVIGATION.map(item => {
                    if ('href' in item) {
                        return (
                            <NavigationMenuItem key={item.title}>
                                <DesktopNavigationLink
                                    href={item.href}
                                    title={item.title}
                                />
                            </NavigationMenuItem>
                        );
                    }

                    return (
                        <NavigationMenuItem
                            key={item.title}
                            className="relative"
                        >
                            <DesktopNavigationTrigger
                                title={item.title}
                                childHrefs={item.sections.flatMap(section => {
                                    return section.links.map(link => link.href);
                                })}
                            />
                            <NavigationMenuContent>
                                <div className="flex gap-6 text-sm normal-case">
                                    {item.sections.map(section => {
                                        const title =
                                            'title' in section
                                                ? section.title
                                                : null;
                                        const isTwoColumn =
                                            section.links.length >
                                            DESKTOP_LINKS_PER_COLUMN;

                                        return (
                                            <div key={title ?? item.title}>
                                                {title && (
                                                    <p className="px-2 pb-1 font-bold text-white">
                                                        {title}
                                                    </p>
                                                )}
                                                <ul
                                                    className={
                                                        isTwoColumn
                                                            ? 'grid grid-cols-2 gap-x-2'
                                                            : undefined
                                                    }
                                                >
                                                    {section.links.map(link => (
                                                        <li key={link.href}>
                                                            <DesktopNavigationLink
                                                                href={link.href}
                                                                isSubmenuLink
                                                                title={
                                                                    link.title
                                                                }
                                                            />
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                    );
                })}
            </NavigationMenuList>
        </NavigationMenu>
    );
}
