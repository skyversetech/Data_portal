import React, { useState, useCallback, useEffect } from 'react'
import Navbar from './components/Navbar.jsx'
import GoogleSheetsPanel from './components/GoogleSheetsPanel.jsx'
import ExcelUploadPanel from './components/ExcelUploadPanel.jsx'
import StatsBar from './components/StatsBar.jsx'
import ToastContainer from './components/ToastContainer.jsx'

const TABS = [
    { id: 'google', label: 'Google Sheets', icon: '📊' },
    { id: 'excel', label: 'Excel Upload', icon: '📁' },
]

export default function App() {
    // Initialize state from localStorage if available
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('p_activeTab') || 'google')
    const [googleData, setGoogleData] = useState(() => {
        const saved = localStorage.getItem('p_googleData')
        return saved ? JSON.parse(saved) : { headers: [], rows: [], sheetName: '' }
    })
    const [excelData, setExcelData] = useState(() => {
        const saved = localStorage.getItem('p_excelData')
        return saved ? JSON.parse(saved) : { headers: [], rows: [], fileName: '', sheets: [] }
    })
    const [toasts, setToasts] = useState([])
    const [googleConfig, setGoogleConfig] = useState(() => {
        const saved = localStorage.getItem('p_googleConfig')
        return saved ? JSON.parse(saved) : { sheetInput: '', tabName: '', autoSync: false }
    })

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('p_activeTab', activeTab)
    }, [activeTab])

    useEffect(() => {
        localStorage.setItem('p_googleData', JSON.stringify(googleData))
    }, [googleData])

    useEffect(() => {
        localStorage.setItem('p_excelData', JSON.stringify(excelData))
    }, [excelData])

    useEffect(() => {
        localStorage.setItem('p_googleConfig', JSON.stringify(googleConfig))
    }, [googleConfig])

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    // Data Update Handlers
    const updateGoogleData = useCallback((newData) => {
        setGoogleData(prev => ({ ...prev, ...newData }))
    }, [])

    const updateGoogleConfig = useCallback((newConfig) => {
        setGoogleConfig(prev => ({ ...prev, ...newConfig }))
    }, [])

    const updateExcelData = useCallback((newData) => {
        setExcelData(prev => ({ ...prev, ...newData }))
    }, [])

    return (
        <div className="app">
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} />

            <main className="main-content">
                <StatsBar googleData={googleData} excelData={excelData} />

                <div className="fade-in" key={activeTab}>
                    {activeTab === 'google' && (
                        <GoogleSheetsPanel
                            data={googleData}
                            setData={updateGoogleData}
                            config={googleConfig}
                            setConfig={updateGoogleConfig}
                            addToast={addToast}
                        />
                    )}

                    {activeTab === 'excel' && (
                        <ExcelUploadPanel
                            data={excelData}
                            setData={updateExcelData}
                            addToast={addToast}
                        />
                    )}
                </div>
            </main>

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    )
}
