import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = ''
}) => {
  const classes = ['james-page-header', className].filter(Boolean).join(' ');

  return (
    <header className={classes}>
      <div className="james-page-header__content">
        <h2 className="james-page-header__title">{title}</h2>
        {subtitle ? (
          <div className="james-page-header__subtitle">{subtitle}</div>
        ) : null}
      </div>

      {actions ? (
        <div className="james-page-header__actions">{actions}</div>
      ) : null}
    </header>
  );
};
