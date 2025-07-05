'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { JSX } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';

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
import { formSubmit } from '@/serverActions/form-sa';

const formSchema = z.object({
    username: z.string().min(2, {
        message: 'Username must be at least 2 characters.'
    }),
    password: z.string().min(8, {
        message: 'Password must be at least 8 characters.'
    })
});

interface FormValues {
    username: string;
    password: string;
}

export default function Home(): JSX.Element {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: 'onBlur',
        defaultValues: {
            username: '',
            password: ''
        }
    });
    const {
        handleSubmit,
        control,
        formState: { isSubmitting }
    } = form;
    console.log('isSubmitting: ', isSubmitting);
    const onSubmit: SubmitHandler<FormValues> = async data => {
        console.log('Form submitted:', data);
        const response = await formSubmit(data);
        console.log('Server response:', response);
    };

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
                Megaliga.NEXT
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
                            <Button type="submit" disabled={isSubmitting}>
                                Submit
                            </Button>
                        </form>
                    </Form>
                </div>
            </main>
            <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
                <span className="flex items-center gap-2 text-sm">
                    <span>&copy;</span>
                    <span>megaliga v.0.0.1</span>
                </span>
            </footer>
        </div>
    );
}
