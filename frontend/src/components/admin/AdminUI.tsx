'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type AdminShellProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: 'standard' | 'wide' | 'narrow';
};

type AdminPanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

type AdminStatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'teal' | 'green' | 'amber' | 'rose' | 'blue';
};

type AdminNoticeProps = {
  tone: 'success' | 'error' | 'warning';
  children: ReactNode;
};

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/games', label: 'Games' },
  { href: '/admin/keys', label: 'Keys' },
  { href: '/admin/verify-payments', label: 'Payments' },
  { href: '/admin/banners', label: 'Banners' },
  { href: '/admin/settings', label: 'Settings' },
];

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function AdminShell({
  title,
  eyebrow = 'Admin console',
  description,
  actions,
  children,
  maxWidth = 'wide',
}: AdminShellProps) {
  const pathname = usePathname();

  return (
    <main className={cx('admin-shell', `admin-shell-${maxWidth}`)}>
      <section className="admin-hero">
        <div className="min-w-0">
          <p className="admin-eyebrow">{eyebrow}</p>
          <h1 className="admin-title">{title}</h1>
          {description && <p className="admin-description">{description}</p>}
        </div>
        {actions && <div className="admin-actions">{actions}</div>}
      </section>

      <nav className="admin-nav" aria-label="Admin navigation">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx('admin-nav-link', isActive && 'admin-nav-link-active')}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="admin-content">{children}</div>
    </main>
  );
}

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
}: AdminPanelProps) {
  return (
    <section className={cx('admin-panel', className)}>
      {(title || description || actions) && (
        <div className="admin-panel-header">
          <div className="min-w-0">
            {title && <h2 className="admin-panel-title">{title}</h2>}
            {description && <p className="admin-panel-description">{description}</p>}
          </div>
          {actions && <div className="admin-panel-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminStatCard({
  label,
  value,
  helper,
  tone = 'teal',
}: AdminStatCardProps) {
  return (
    <div className={cx('admin-stat-card', `admin-stat-${tone}`)}>
      <span className="admin-stat-dot" />
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value">{value}</p>
      {helper && <p className="admin-stat-helper">{helper}</p>}
    </div>
  );
}

export function AdminNotice({ tone, children }: AdminNoticeProps) {
  return <div className={cx('admin-notice', `admin-notice-${tone}`)}>{children}</div>;
}

export function AdminEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      <div className="admin-empty-mark" />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function AdminPageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <main className="admin-shell admin-shell-wide">
      <div className="admin-skeleton-title" />
      <div className="admin-skeleton-grid">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="admin-skeleton-card" />
        ))}
      </div>
    </main>
  );
}

export function AdminAccessRequired() {
  return (
    <main className="admin-shell admin-shell-narrow">
      <AdminEmpty
        title="Admin access required"
        description="Sign in with an administrator account to continue."
        action={
          <Link href="/login" className="btn-primary px-5">
            Sign in
          </Link>
        }
      />
    </main>
  );
}
