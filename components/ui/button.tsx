"use client";

export function Button({
  children,
  type = "button",
  className = "",
  disabled = false,
  onClick
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`btn ${className}`}>
      {children}
    </button>
  );
}
