import type { ButtonHTMLAttributes, ReactNode } from 'react';

type PortalButtonVariant = 'primary' | 'secondary' | 'dark';

type PortalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PortalButtonVariant;
  children: ReactNode;
};

const VARIANT_CLASS: Record<PortalButtonVariant, string> = {
  primary: 'portal-btn-primary',
  secondary: 'portal-btn-secondary',
  dark: 'portal-btn-dark',
};

/** Shared portal action button — maps to existing `.portal-btn-*` styles. */
export function PortalButton({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...rest
}: PortalButtonProps) {
  const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
