import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "sso";

const buttonClassByVariant: Record<ButtonVariant, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  ghost: "ghost-button",
  sso: "sso-button",
};

type ButtonProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
};

export function Button({
  ariaLabel,
  children,
  className = "",
  disabled,
  icon,
  onClick,
  type = "button",
  variant = "primary",
}: ButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={`${buttonClassByVariant[variant]} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <button className="ghost-icon" type="button" aria-label={ariaLabel}>
      {children}
    </button>
  );
}

type TextFieldProps = {
  autoComplete?: string;
  endIcon?: ReactNode;
  icon: ReactNode;
  label: string;
  name?: string;
  placeholder: string;
  type: "email" | "password" | "text";
};

export function TextField({
  autoComplete,
  endIcon,
  icon,
  label,
  name,
  placeholder,
  type,
}: TextFieldProps) {
  return (
    <label>
      <span>{label}</span>
      <div className="field">
        {icon}
        <input name={name} type={type} placeholder={placeholder} autoComplete={autoComplete} />
        {endIcon}
      </div>
    </label>
  );
}

export function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "warning";
}) {
  return <em className={tone}>{children}</em>;
}

export function FeatureItem({
  icon,
  text,
  title,
}: {
  icon: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <article className="feature-item">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

export function MetricCard({
  label,
  metric,
  name,
}: {
  label: string;
  metric: string;
  name: string;
}) {
  return (
    <article>
      <span>{name}</span>
      <strong>{metric}</strong>
      <small>{label}</small>
    </article>
  );
}
