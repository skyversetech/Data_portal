import React, { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import DataTable from './DataTable.jsx'

export default function ExcelUploadPanel({ data, setData, addToast }) {
    const [dragOver, setDragOver] = useState(false)
    const [activeSheet, setActiveSheet] = useState(0)
    const [allSheets, setAllSheets] = useState([])
    const [autoSync, setAutoSync] = useState(false)
    const [lastSynced, setLastSynced] = useState(null)
    const [fileHandle, setFileHandle] = useState(null)
    const fileInputRef = useRef(null)

    // Auto-Sync Effect for Excel
    useEffect(() => {
        let interval
        if (autoSync && fileHandle) {
            interval = setInterval(async () => {
                try {
                    const file = await fileHandle.getFile()
                    processFile(file, true)
                } catch (err) {
                    console.error('Excel sync error:', err)
                }
            }, 30000)
        }
        return () => clearInterval(interval)
    }, [autoSync, fileHandle])

    const processFile = (file, silent = false) => {
        if (!file) return

        const validExtensions = ['.xlsx', '.xls', '.csv']
        const ext = '.' + file.name.split('.').pop().toLowerCase()

        if (!validExtensions.includes(ext)) {
            if (!silent) addToast('Please upload a valid Excel or CSV file', 'error')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target.result
                const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
                const sheetsData = workbook.SheetNames.map((name) => {
                    const sheet = workbook.Sheets[name]
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
                    if (jsonData.length === 0) return { name, headers: [], rows: [] }

                    const rawHeaders = jsonData[0].map(h => h ? String(h).trim() : '')
                    const rawRows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''))

                    const keepColumns = rawHeaders.map((header, ci) => {
                        if (header) return true
                        return rawRows.some(row => row[ci] && String(row[ci]).trim() !== '')
                    })

                    const headers = rawHeaders.filter((_, ci) => keepColumns[ci]).map((h, i) => h || `Column ${i + 1}`)
                    const formattedRows = rawRows.map(row => {
                        return rawHeaders.map((_, ci) => {
                            if (!keepColumns[ci]) return null
                            const val = row[ci]
                            if (val instanceof Date) return val.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            return val ?? ''
                        }).filter(cell => cell !== null)
                    })

                    return { name, headers, rows: formattedRows }
                })

                setAllSheets(sheetsData)
                const current = sheetsData[activeSheet] || sheetsData[0]
                setData({
                    headers: current.headers,
                    rows: current.rows,
                    fileName: file.name,
                    sheets: sheetsData.map(s => s.name),
                })

                setLastSynced(new Date().toLocaleTimeString())
                if (!silent) {
                    const totalRows = sheetsData.reduce((sum, s) => sum + s.rows.length, 0)
                    addToast(`Loaded "${file.name}" — ${sheetsData.length} sheet(s), ${totalRows} rows`, 'success')
                }
            } catch (err) {
                console.error('Excel parse error:', err)
                if (!silent) addToast('Failed to parse the file', 'error')
            }
        }
        reader.readAsArrayBuffer(file)
    }

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (file) {
            processFile(file)
            setFileHandle(null)
            setAutoSync(false)
        }
    }

    const selectWithFileSystem = async () => {
        try {
            if ('showOpenFilePicker' in window) {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Excel/CSV Files',
                        accept: {
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                            'application/vnd.ms-excel': ['.xls'],
                            'text/csv': ['.csv']
                        }
                    }]
                })
                setFileHandle(handle)
                const file = await handle.getFile()
                processFile(file)
                setAutoSync(true)
            } else {
                fileInputRef.current?.click()
            }
        } catch (err) {
            console.warn('File picker cancelled or not supported', err)
        }
    }

    const clearFile = () => {
        setData({ headers: [], rows: [], fileName: '', sheets: [] })
        setAllSheets([])
        setActiveSheet(0)
        setFileHandle(null)
        setAutoSync(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        addToast('File cleared', 'info')
    }

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">
                        <span className="section-title-icon excel">📁</span>
                        Excel File Upload
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 4 }}>
                        {data.fileName && <span className="section-badge">{data.fileName}</span>}
                        {autoSync && fileHandle && (
                            <div className="sync-status">
                                <span className="pulse-dot"></span>
                                Watch Mode Active {lastSynced && `(Synced: ${lastSynced})`}
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {fileHandle && (
                        <label className="switch-container">
                            <input
                                type="checkbox"
                                checked={autoSync}
                                onChange={(e) => setAutoSync(e.target.checked)}
                            />
                            <span className="switch-label">Live Watch</span>
                        </label>
                    )}
                    {data.fileName && (
                        <button className="btn btn-outline btn-sm" onClick={clearFile}>✕ Clear</button>
                    )}
                </div>
            </div>

            <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    processFile(e.dataTransfer.files?.[0]);
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={selectWithFileSystem}
                id="excel-upload-zone"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="upload-zone-input"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    style={{ pointerEvents: 'none' }}
                />
                <div className="upload-zone-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>
                <div className="upload-zone-title">
                    {fileHandle ? 'Watching file...' : 'Drop your Excel file here or click to browse'}
                </div>
                <div className="upload-zone-subtitle">
                    {fileHandle ? 'Updates will reflect automatically' : 'Supports .xlsx, .xls, and .csv files'}
                </div>
            </div>

            {data.fileName && allSheets.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                    <div className="upload-file-info">
                        <div className="upload-file-info-icon">📄</div>
                        <div className="upload-file-info-text">
                            <div className="upload-file-name">{data.fileName}</div>
                            <div className="upload-file-meta">
                                {allSheets.length} sheet(s) • {allSheets.reduce((s, sh) => s + sh.rows.length, 0)} total rows
                            </div>
                        </div>
                    </div>

                    {allSheets.length > 1 && (
                        <div className="sheet-tabs" style={{ marginTop: 'var(--space-4)' }}>
                            {allSheets.map((sheet, i) => (
                                <button
                                    key={i}
                                    className={`sheet-tab ${activeSheet === i ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveSheet(i);
                                        setData(prev => ({ ...prev, headers: sheet.headers, rows: sheet.rows }));
                                    }}
                                >
                                    {sheet.name} ({sheet.rows.length} rows)
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 'var(--space-6)' }}>
                <DataTable headers={data.headers} rows={data.rows} setData={setData} />
            </div>
        </div>
    )
}
