'use client';

import type { ComponentProps } from 'react';

import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/utils/utils';

const sheetVariants = cva(
    'fixed z-50 flex flex-col bg-background shadow-lg motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:duration-200',
    {
        variants: {
            side: {
                top: 'inset-x-0 top-0 motion-safe:data-[state=open]:slide-in-from-top motion-safe:data-[state=closed]:slide-out-to-top',
                right: 'inset-y-0 right-0 w-3/4 sm:max-w-sm motion-safe:data-[state=open]:slide-in-from-right motion-safe:data-[state=closed]:slide-out-to-right',
                bottom: 'inset-x-0 bottom-0 motion-safe:data-[state=open]:slide-in-from-bottom motion-safe:data-[state=closed]:slide-out-to-bottom',
                left: 'inset-y-0 left-0 w-3/4 sm:max-w-sm motion-safe:data-[state=open]:slide-in-from-left motion-safe:data-[state=closed]:slide-out-to-left'
            }
        },
        defaultVariants: { side: 'right' }
    }
);

export function SheetContent({
    side,
    className,
    children,
    showCloseButton = true,
    ...props
}: ComponentProps<typeof SheetPrimitive.Content> &
    VariantProps<typeof sheetVariants> & { showCloseButton?: boolean }) {
    return (
        <SheetPrimitive.Portal>
            <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in" />
            <SheetPrimitive.Content
                {...props}
                className={cn(sheetVariants({ side }), className)}
            >
                {children}
                {showCloseButton && (
                    <SheetPrimitive.Close
                        aria-label="Zamknij"
                        className="absolute top-4 right-4 rounded-sm p-2 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <X aria-hidden="true" size={20} />
                    </SheetPrimitive.Close>
                )}
            </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
    );
}

export const Sheet = SheetPrimitive.Root;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;
export const SheetTrigger = SheetPrimitive.Trigger;
