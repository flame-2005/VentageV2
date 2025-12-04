import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Toast} from '../components/Toast';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
    id: number;
    title: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [counter, setCounter] = useState(0);

    const addToast = (type: ToastType, title: string, message: string) => {
        const newToast: ToastMessage = {
            id: counter,
            title,
            message,
            type
        };
        setToasts(prev => [...prev, newToast]);
        setCounter(prev => prev + 1);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {toasts.map((toast, index) => (
                <div 
                    key={toast.id} 
                    style={{ top: `${16 + index * 120}px` }} 
                    className="fixed right-4 z-[9999]"
                >
                    <Toast
                        title={toast.title}
                        message={toast.message}
                        type={toast.type}
                        duration={5000}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </ToastContext.Provider>
    );
};