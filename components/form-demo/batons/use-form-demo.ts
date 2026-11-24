'use client';

import type { FormValues } from '@/components/form-demo/form-demo.types';
import type { SubmitHandler } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { formSubmit } from '@/server/actions/form-sa';

const formSchema = z.object({
    username: z.string().min(2, {
        message: 'Username must be at least 2 characters.'
    }),
    password: z.string().min(8, {
        message: 'Password must be at least 8 characters.'
    })
});

export const useFormDemo = () => {
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

    const onSubmit: SubmitHandler<FormValues> = async data => {
        console.log('Form submitted:', data);
        const response = await formSubmit(data);
        console.log('Server response:', response);
    };

    return { form, handleSubmit, control, isSubmitting, onSubmit };
};
