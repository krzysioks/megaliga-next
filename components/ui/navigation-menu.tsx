'use client';

import type { ComponentProps } from 'react';

import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';

import { cn } from '@/utils/utils';

function NavigationMenu({
    className,
    ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Root>) {
    return (
        <NavigationMenuPrimitive.Root
            className={cn('relative z-10', className)}
            {...props}
        />
    );
}

function NavigationMenuContent({
    className,
    ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Content>) {
    return (
        <NavigationMenuPrimitive.Content
            className={cn(
                'absolute top-full left-1/2 w-max -translate-x-1/2 rounded-md bg-navigation-panel p-4 text-primary shadow-lg motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in',
                className
            )}
            {...props}
        />
    );
}

export { NavigationMenu, NavigationMenuContent };

export const NavigationMenuItem = NavigationMenuPrimitive.Item;
export const NavigationMenuLink = NavigationMenuPrimitive.Link;
export const NavigationMenuList = NavigationMenuPrimitive.List;
export const NavigationMenuTrigger = NavigationMenuPrimitive.Trigger;
