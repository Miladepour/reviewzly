import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        
        // Auto-dismiss safely after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const getIcon = (type) => {
        switch(type) {
            case 'success':
                return '✓';
            case 'error':
                return '⚠';
            case 'warning':
                return 'ⓘ';
            default:
                return '•';
        }
    };

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 99999,
                alignItems: 'flex-end',
                pointerEvents: 'none'
            }}>
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        style={{
                            padding: '1rem 1.5rem',
                            borderRadius: '12px',
                            background: toast.type === 'error' ? '#D32F2F' : (toast.type === 'success' ? '#2E7D32' : (toast.type === 'warning' ? '#F57C00' : '#102A14')),
                            color: 'white',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                            minWidth: '280px',
                            maxWidth: '400px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                            pointerEvents: 'auto',
                            fontFamily: '"SF Pro Display", -apple-system, sans-serif'
                        }}
                    >
                        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{getIcon(toast.type)}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4 }}>
                                {toast.type === 'error' ? 'Error' : toast.type === 'warning' ? 'Warning' : toast.type === 'success' ? 'Success' : 'Notification'}
                            </span>
                            <span style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '2px', lineHeight: 1.4 }}>{toast.message}</span>
                        </div>
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}} />
        </ToastContext.Provider>
    );
};
