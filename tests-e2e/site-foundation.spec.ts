import { expect, test } from '@playwright/test';

const DESKTOP_NAVIGATION_BREAKPOINT = 1024;

test('Should redirect the site entry to Trybuna and render the shared layout', async ({
    page
}) => {
    await page.goto('/');

    await expect(page).toHaveURL('/trybuna');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trybuna');
    await expect(page.getByRole('contentinfo')).toHaveText(
        '© megaliga.NEXT v1.0'
    );
    await expect(
        page.getByRole('button', { name: 'Konto użytkownika' })
    ).toBeDisabled();
    await page.getByRole('link', { name: 'Panel użytkownika' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Dashboard'
    );
    await page.getByRole('link', { name: 'Megaliga – Trybuna' }).click();
    await expect(page).toHaveURL('/trybuna');
});

test('Should open public pages through the menu and show Polish metadata', async ({
    isMobile,
    page
}) => {
    await page.goto('/trybuna');

    async function openMenu() {
        if (isMobile) {
            await page.getByRole('button', { name: 'Otwórz menu' }).click();
            await expect(
                page.getByRole('dialog', { name: 'Menu' })
            ).toBeVisible();
        }

        return page.getByRole('navigation', { name: 'Menu główne' });
    }

    const navigation = await openMenu();
    await expect(
        navigation.getByRole('link', { name: 'Trybuna' })
    ).toHaveAttribute('aria-current', 'page');
    await navigation.getByRole('link', { name: 'Zasady' }).click();
    await expect(page).toHaveURL('/zasady');
    await expect(page).toHaveTitle('Zasady | Megaliga.NEXT');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        'Regulamin Megaligi i zasady punktacji.'
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');

    const destinations = [
        { group: 'Tabela', label: 'Playoffs', url: '/tabela/playoffs' },
        {
            group: 'Wyniki',
            label: 'Kolejka 14',
            url: '/wyniki/megaliga/kolejka/14'
        },
        {
            group: 'Wyniki',
            label: 'Kolejka 4',
            url: '/wyniki/playoffs/kolejka/4'
        },
        { group: 'Historia', label: '2026', url: '/historia/2026' }
    ];

    for (const destination of destinations) {
        await openMenu();
        await navigation.getByText(destination.group, { exact: true }).click();
        await navigation
            .getByRole('link', { name: destination.label, exact: true })
            .and(navigation.locator(`[href="${destination.url}"]`))
            .click();
        await expect(page).toHaveURL(destination.url);
        await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
    }
});

test('Should place the footer at the bottom of the viewport on a short page', async ({
    page
}) => {
    await page.goto('/trybuna');

    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    const gapBelowFooter = await footer.evaluate(element => {
        return window.innerHeight - element.getBoundingClientRect().bottom;
    });
    expect(gapBelowFooter).toBeCloseTo(0, 0);
});

test('Should render the boundary rounds and history years and reject invalid URLs', async ({
    page
}) => {
    const boundaries = [
        ['/wyniki/megaliga/kolejka/1', 'Wyniki – Megaliga – Kolejka 1'],
        ['/wyniki/megaliga/kolejka/14', 'Wyniki – Megaliga – Kolejka 14'],
        ['/wyniki/playoffs/kolejka/1', 'Wyniki – Playoffs – Kolejka 1'],
        ['/wyniki/playoffs/kolejka/4', 'Wyniki – Playoffs – Kolejka 4'],
        ['/historia/2018', 'Historia – 2018'],
        ['/historia/2026', 'Historia – 2026']
    ];

    for (const [url, heading] of boundaries) {
        const response = await page.goto(url);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
            heading
        );
    }

    for (const url of [
        '/tabela/inne',
        '/wyniki/inne/kolejka/1',
        '/wyniki/megaliga/kolejka/15',
        '/wyniki/playoffs/kolejka/5',
        '/historia/2017'
    ]) {
        const response = await page.goto(url);
        expect(response?.status()).toBe(404);
    }
});

test('Should open the desktop standings menu and navigate using the keyboard', async ({
    isMobile,
    page
}) => {
    test.skip(isMobile, 'Desktop navigation only.');
    await page.goto('/trybuna');

    await page.getByRole('button', { name: 'Tabela' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    const standingsLink = page.getByRole('link', {
        name: 'Megaliga',
        exact: true
    });
    await expect(standingsLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/tabela/megaliga');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Tabela – Megaliga'
    );
});

test('Should dismiss the mobile menu and return focus to its trigger', async ({
    isMobile,
    page
}) => {
    test.skip(!isMobile, 'Mobile navigation only.');
    await page.goto('/trybuna');
    const trigger = page.getByRole('button', { name: 'Otwórz menu' });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
    await expect(trigger).toBeFocused();
});

test('Should underline Historia on a history page while its submenu is closed', async ({
    isMobile,
    page
}) => {
    test.skip(isMobile, 'Desktop navigation only.');
    await page.goto('/historia/2026');

    const historyTrigger = page.getByRole('button', { name: 'Historia' });
    await expect(historyTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(historyTrigger).toHaveCSS('text-decoration-line', 'underline');
});

test('Should switch from the mobile menu to desktop navigation at 1024px', async ({
    isMobile,
    page
}) => {
    test.skip(!isMobile, 'Mobile navigation only.');
    await page.setViewportSize({
        width: DESKTOP_NAVIGATION_BREAKPOINT - 1,
        height: 768
    });
    await page.goto('/trybuna');
    const mobileTrigger = page.getByRole('button', { name: 'Otwórz menu' });
    const desktopTrigger = page.getByRole('button', { name: 'Tabela' });
    await expect(mobileTrigger).toBeVisible();
    await expect(desktopTrigger).toBeHidden();
    await mobileTrigger.click();
    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect(menu).toBeVisible();

    await page.setViewportSize({
        width: DESKTOP_NAVIGATION_BREAKPOINT,
        height: 768
    });
    await expect(menu).toHaveCount(0);
    await expect(mobileTrigger).toBeHidden();
    await expect(desktopTrigger).toBeVisible();
    const navigation = page.getByRole('navigation', { name: 'Menu główne' });
    await navigation.getByRole('link', { name: 'Zasady' }).click();
    await expect(page).toHaveURL('/zasady');
});
