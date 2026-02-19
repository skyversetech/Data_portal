import React, { useState } from 'react'
import DataTable from './DataTable.jsx'

/**
 * Google Sheets integration via the public Google Visualization API.
 * 
 * HOW TO USE:
 * 1. Open your Google Sheet
 * 2. Go to File → Share → Publish to the web → Publish the entire document
 * 3. Copy the Sheet ID from the URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
 * 4. Paste the Sheet ID or full URL into the input field below
 * 5. (Optional) Specify the sheet/tab name if your workbook has multiple sheets
 */

function extractSheetId(input) {
    if (!input) return ''
    const trimmed = input.trim()

    // 1. Handle "published" URLs: /spreadsheets/d/e/ID/...
    const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/)
    if (pubMatch) return pubMatch[1]

    // 2. Handle "standard" URLs: /spreadsheets/d/ID/...
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    if (match) {
        // Only return if it's not just "e"
        if (match[1] !== 'e') return match[1]
        // If it was "e", try to match again after /d/e/
        const secondMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/)
        if (secondMatch) return secondMatch[1]
    }

    return trimmed
}

function parseGoogleCSV(csvText) {
    const rows = []
    let currentRow = []
    let currentCell = ''
    let insideQuotes = false

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i]
        const nextChar = csvText[i + 1]

        if (insideQuotes) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"'
                i++
            } else if (char === '"') {
                insideQuotes = false
            } else {
                currentCell += char
            }
        } else {
            if (char === '"') {
                insideQuotes = true
            } else if (char === ',') {
                currentRow.push(currentCell.trim())
                currentCell = ''
            } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                currentRow.push(currentCell.trim())
                if (currentRow.some(c => c !== '')) {
                    rows.push(currentRow)
                }
                currentRow = []
                currentCell = ''
                if (char === '\r') i++
            } else {
                currentCell += char
            }
        }
    }
    // Last cell
    currentRow.push(currentCell.trim())
    if (currentRow.some(c => c !== '')) {
        rows.push(currentRow)
    }

    return rows
}

export default function GoogleSheetsPanel({ data, setData, config, setConfig, addToast }) {
    const { sheetInput, tabName, autoSync } = config
    const [loading, setLoading] = useState(false)
    const [showGuide, setShowGuide] = useState(false)
    const [lastSynced, setLastSynced] = useState(null)

    // Update specific pieces of config
    const updateConfig = (updates) => setConfig({ ...config, ...updates })

    const fetchSheet = React.useCallback(async (isBackground = false) => {
        const sheetId = extractSheetId(sheetInput)

        if (!sheetId) {
            if (!isBackground) addToast('Please enter a valid Google Sheet ID or URL', 'error')
            return
        }

        if (!isBackground) setLoading(true)
        try {
            let url = ''
            if (sheetId.startsWith('2PACX-')) {
                url = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv`
                if (tabName.trim()) url += `&gid=${encodeURIComponent(tabName.trim())}`
            } else {
                url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`
                if (tabName.trim()) url += `&sheet=${encodeURIComponent(tabName.trim())}`
            }

            // Enhanced Cache Busting
            const cacheBuster = `_cb=${Date.now()}`
            url += `${url.includes('?') ? '&' : '?'}${cacheBuster}`

            const response = await fetch(url, { cache: 'no-store' })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)

            const csvText = await response.text()

            // Check if we got actual data or an error page
            if (!csvText || csvText.includes('<!DOCTYPE html>')) {
                throw new Error('Invalid format: Ensure the sheet is "Published to web".')
            }

            const allRows = parseGoogleCSV(csvText)
            if (allRows.length > 0) {
                const headers = allRows[0]
                const rows = allRows.slice(1).map(row => {
                    const normalized = [...row]
                    while (normalized.length < headers.length) normalized.push('')
                    return normalized.slice(0, headers.length)
                })

                setData({ headers, rows, sheetName: tabName || 'Sheet1' })
                if (!isBackground) addToast(`Successfully loaded ${rows.length} rows`, 'success')
            }

            setLastSynced(new Date().toLocaleTimeString())
        } catch (err) {
            console.error('Fetch error:', err)
            if (!isBackground) addToast(err.message || 'Failed to fetch data', 'error')
        } finally {
            if (!isBackground) setLoading(false)
        }
    }, [sheetInput, tabName, setData, addToast])

    // Auto-Sync Effect
    React.useEffect(() => {
        let interval
        if (autoSync && sheetInput.trim()) {
            interval = setInterval(() => {
                fetchSheet(true)
            }, 30000)
        }
        return () => clearInterval(interval)
    }, [autoSync, sheetInput, fetchSheet])



    return (
        <div>
            <div className="section-header">
                <div>
                    <h2 className="section-title">
                        <span className="section-title-icon google">📊</span>
                        Google Sheets Data
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 4 }}>
                        {data.rows.length > 0 && <span className="section-badge">{data.rows.length} rows</span>}
                        {autoSync && (
                            <div className="sync-status">
                                <span className="pulse-dot"></span>
                                Live Syncing {lastSynced && `(Last: ${lastSynced})`}
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <label className="switch-container">
                        <input
                            type="checkbox"
                            checked={autoSync}
                            onChange={(e) => updateConfig({ autoSync: e.target.checked })}
                        />
                        <span className="switch-label">Auto-Sync</span>
                    </label>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowGuide(!showGuide)}>
                        {showGuide ? '📖 Hide' : '❓ How to?'}
                    </button>
                </div>
            </div>

            {showGuide && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)', background: 'rgba(99, 102, 241, 0.05)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-3)', color: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📖 Setup Instructions</span>
                    </h3>
                    <ol style={{ fontSize: 'var(--font-size-sm)', paddingLeft: 'var(--space-5)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                        <li>Open your Google Sheet.</li>
                        <li>Click <b>File</b> → <b>Share</b> → <b>Publish to the web</b>.</li>
                        <li>Select <b>Entire Document</b> and <b>Web Page</b>, then click <b>Publish</b>.</li>
                        <li>Copy the URL from the browser's address bar and paste it below.</li>
                    </ol>
                </div>
            )}

            <div className="config-panel">
                <div className="config-form-grid">
                    <div className="config-field config-field-url">
                        <label className="config-label">Google Sheet URL or ID</label>
                        <input
                            type="text"
                            className="config-input"
                            placeholder="Paste your Google Sheet link here..."
                            value={sheetInput}
                            onChange={e => updateConfig({ sheetInput: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && fetchSheet()}
                        />
                    </div>
                    <div className="config-field config-field-tab">
                        <label className="config-label">Tab Name (optional)</label>
                        <input
                            type="text"
                            className="config-input"
                            placeholder="e.g. Sheet1"
                            value={tabName}
                            onChange={e => updateConfig({ tabName: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && fetchSheet()}
                        />
                    </div>
                    <div className="config-field config-field-btn">
                        <button
                            className="btn btn-primary config-fetch-btn"
                            onClick={() => fetchSheet()}
                            disabled={loading || !sheetInput.trim()}
                        >
                            {loading ? <span className="spinner" style={{ width: 16, height: 16 }}></span> : '🔄 Fetch Now'}
                        </button>
                    </div>
                </div>
                <div className="help-text">
                    💡 Auto-sync refreshes data every 30 seconds when enabled.
                </div>
            </div>

            {loading && (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>Fetching data from Google Sheets...</div>
                </div>
            )}

            {!loading && <DataTable headers={data.headers} rows={data.rows} setData={setData} />}
        </div>
    )
}
