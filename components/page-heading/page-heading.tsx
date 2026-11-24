import type { PageHeadingProps } from '@/components/page-heading/page-heading.types';

export default function PageHeading(props: PageHeadingProps) {
    const { children } = props;

    return (
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">
            {children}
        </h1>
    );
}
