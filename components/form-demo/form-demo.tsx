'use client';
import type { JSX } from 'react';

import { useFormDemo } from '@/components/form-demo/batons/use-form-demo';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export default function FormDemo(): JSX.Element {
    const { form, handleSubmit, control, isSubmitting, onSubmit } =
        useFormDemo();

    return (
        <div className="grid justify-items-center p-8">
            <div className="flex flex-col items-center gap-8 sm:items-start">
                <h1 className="text-xl font-bold">Formularz testowy</h1>
                <div className="flex flex-col gap-[16px] w-full sm:w-[400px]">
                    <Form {...form}>
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-8"
                        >
                            <FormField
                                control={control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Username</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="username"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Please provide your username.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Please provide your password.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" isLoading={isSubmitting}>
                                Submit
                            </Button>
                        </form>
                    </Form>
                </div>
                <section aria-labelledby="button-states-title">
                    <h2 id="button-states-title" className="mb-3 font-bold">
                        Stany przycisków
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <Button type="button">Weryfikuj</Button>
                        <Button type="button" variant="secondary">
                            Cofnij
                        </Button>
                        <Button type="button" disabled>
                            Dalej
                        </Button>
                        <Button type="button" isLoading>
                            Losuj
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
}
