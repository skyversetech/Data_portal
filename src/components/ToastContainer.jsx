import React from 'react'

export default function ToastContainer({ toasts, removeToast }) {
    if (!toasts.length) return null

    return (
        <div className="toast-container" id="toast-container">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`toast ${toast.type}`}
                    onClick={() => removeToast(toast.id)}
                    style={{ cursor: 'pointer' }}
                >
                    <span>
                        {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
                    </span>
                    <span>{toast.message}</span>
                </div>
            ))}
        </div>
    )
}
