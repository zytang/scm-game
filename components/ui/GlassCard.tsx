
import { clsx, type ClassValue } from 'clsx';
import { ReactNode } from 'react';

interface GlassCardProps {
    children: ReactNode;
    className?: ClassValue;
    onClick?: () => void;
}

export function GlassCard({ children, className, onClick }: GlassCardProps) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "glass-card p-6 border border-white/10 shadow-lg text-white", // Base Utility
                className
            )}
        >
            {children}
        </div>
    );
}
