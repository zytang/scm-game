
import { clsx, type ClassValue } from 'clsx';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
    className?: ClassValue;
}

export function Button({ children, variant = 'primary', className, ...props }: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "btn-primary", // Defined in globals.css
        secondary: "btn-secondary",
        danger: "bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 py-3 font-bold shadow-lg shadow-red-900/40"
    };

    return (
        <button
            className={clsx(baseStyles, variants[variant], className)}
            {...props}
        >
            {children}
        </button>
    );
}
