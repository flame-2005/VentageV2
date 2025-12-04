import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    title: string;
    message: string;
    type?: ToastType;
    duration?: number;
    onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
    title,
    message,
    type = 'info',
    duration = 5000,
    onClose
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isLeaving, setIsLeaving] = useState(false);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => {
            setIsVisible(false);
            onClose?.();
        }, 300);
    };

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration]);

    if (!isVisible) return null;

    const typeConfig: Record<ToastType, { icon: React.ReactNode; bgColor: string; borderColor: string; iconColor: string }> = {
        success: {
            icon: <CheckCircle className="w-5 h-5" />,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            iconColor: 'text-green-600'
        },
        error: {
            icon: <AlertCircle className="w-5 h-5" />,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            iconColor: 'text-red-600'
        },
        warning: {
            icon: <AlertTriangle className="w-5 h-5" />,
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            iconColor: 'text-yellow-600'
        },
        info: {
            icon: <Info className="w-5 h-5" />,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            iconColor: 'text-blue-600'
        }
    };

    const config = typeConfig[type];

    return (
        <div
            className={`max-w-md w-full shadow-lg rounded-lg border ${config.bgColor} ${config.borderColor} transition-all duration-300 ${
                isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
            }`}
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 ${config.iconColor}`}>
                        {config.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-700">
                            {message}
                        </p>
                    </div>

                    <button
                        onClick={handleClose}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close notification"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {duration > 0 && (
                    <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${
                                type === 'success' ? 'bg-green-500' :
                                type === 'error' ? 'bg-red-500' :
                                type === 'warning' ? 'bg-yellow-500' :
                                'bg-blue-500'
                            }`}
                            style={{
                                animation: `shrink ${duration}ms linear forwards`
                            }}
                        />
                    </div>
                )}
            </div>

            <style>{`
                @keyframes shrink {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>
        </div>
    );
};