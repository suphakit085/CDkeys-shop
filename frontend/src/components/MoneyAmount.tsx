const BAHT_SYMBOL = '\u0e3f';

const sizeClasses = {
    sm: 'text-sm',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
};

function formatAmount(value: number | string | null | undefined) {
    const amount = Number(value || 0);

    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
}

export default function MoneyAmount({
    value,
    size = 'md',
    align = 'left',
}: {
    value: number | string | null | undefined;
    size?: keyof typeof sizeClasses;
    align?: 'left' | 'right';
}) {
    return (
        <span
            className={`inline-flex items-baseline gap-1 whitespace-nowrap font-black tabular-nums ${sizeClasses[size]} ${
                align === 'right' ? 'justify-end' : ''
            }`}
        >
            <span className="text-[0.7em] leading-none text-[var(--text-muted)]">{BAHT_SYMBOL}</span>
            <span>{formatAmount(value)}</span>
        </span>
    );
}
