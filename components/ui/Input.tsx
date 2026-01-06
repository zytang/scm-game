
import { clsx, type ClassValue } from 'clsx';
import { InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
    label?: string;
    className?: ClassValue;
}

export function Input({ label, className, ...props }: InputProps) {
    return (
        <div className="flex flex-col gap-2 w-full">
            {label && <label className="text-sm font-medium text-blue-200/80 uppercase tracking-wider">{label}</label>}
            <input
                className={clsx("input-glass", className)}
                {...props}
            />
        </div>
    );
}
