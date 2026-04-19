import Link from 'next/link';

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed';

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

const variantStyles = {
  primary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-deep)] hover:scale-[1.02] shadow-lg shadow-[var(--color-primary)]/30',
  ghost:
    'glass text-[var(--color-fg)] hover:bg-white/10 hover:scale-[1.02]',
  gold:
    'bg-[var(--color-gold)] text-[#1a1208] hover:bg-[var(--color-gold-soft)] hover:scale-[1.02] shadow-lg shadow-[var(--color-gold)]/30',
};

export function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  onClick,
  disabled,
  ...rest
}) {
  const cls = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
