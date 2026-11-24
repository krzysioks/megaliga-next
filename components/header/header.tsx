import Image from 'next/image';
import Link from 'next/link';

import { DesktopNavigation } from '@/components/desktop-navigation';
import { MobileNavigation } from '@/components/mobile-navigation';
import { Button } from '@/components/ui/button';
import { SITE_ICONS, SITE_PAGES } from '@/constants/site-navigation.constants';

export default function Header() {
    return (
        <header className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-3 sm:px-6 lg:py-4">
            <Link
                className="col-start-2 row-start-1 justify-self-center rounded-sm focus-visible:outline-2 focus-visible:outline-ring lg:col-start-1 lg:justify-self-start"
                href={SITE_PAGES.trybuna.href}
            >
                <Image
                    alt="Megaliga – Trybuna"
                    className="h-auto w-18 lg:w-25"
                    height={186}
                    loading="eager"
                    src={SITE_ICONS.logo}
                    width={230}
                />
            </Link>

            <div className="col-start-1 row-start-1 lg:col-start-2">
                <MobileNavigation />
                <DesktopNavigation />
            </div>

            <Button
                aria-label="Konto użytkownika"
                className="col-start-1 row-start-1 ml-10 size-11 justify-self-start text-primary hover:cursor-pointer hover:bg-transparent hover:text-secondary disabled:pointer-events-auto disabled:bg-transparent disabled:text-primary disabled:hover:text-secondary lg:col-start-3 lg:ml-0 lg:justify-self-end"
                disabled
                size="icon"
                type="button"
                variant="ghost"
            >
                <span
                    aria-hidden="true"
                    className="size-7 bg-current mask-contain mask-center mask-no-repeat"
                    style={{ maskImage: `url(${SITE_ICONS.account})` }}
                />
            </Button>

            <Link
                aria-label="Panel użytkownika"
                className="col-start-3 row-start-1 flex size-11 items-center justify-center justify-self-end rounded-sm text-primary hover:text-secondary focus-visible:outline-2 focus-visible:outline-ring lg:mr-12"
                href={SITE_PAGES.dashboard.href}
            >
                <span
                    aria-hidden="true"
                    className="size-7 bg-current mask-contain mask-center mask-no-repeat"
                    style={{ maskImage: `url(${SITE_ICONS.dashboard})` }}
                />
            </Link>
        </header>
    );
}
