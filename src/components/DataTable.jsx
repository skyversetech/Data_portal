import React, { useState, useMemo, useRef, useEffect } from 'react'

const ROWS_PER_PAGE = 25

export default function DataTable({ headers, rows, setData, sourceLabel }) {
    const [search, setSearch] = useState('')
    const [sortCol, setSortCol] = useState(null)
    const [sortDir, setSortDir] = useState('asc')
    const [page, setPage] = useState(0)

    // Editing state
    const [editCell, setEditCell] = useState(null) // { rowIndex, colIndex }
    const [tempValue, setTempValue] = useState('')
    const editInputRef = useRef(null)

    useEffect(() => {
        if (editCell !== null && editInputRef.current) {
            editInputRef.current.focus()
            editInputRef.current.select()
        }
    }, [editCell])

    const filteredRows = useMemo(() => {
        if (!search.trim()) return rows
        const q = search.toLowerCase()
        return rows.filter(row =>
            row.some(cell => String(cell).toLowerCase().includes(q))
        )
    }, [rows, search])

    const sortedRows = useMemo(() => {
        if (sortCol === null) return filteredRows
        return [...filteredRows].sort((a, b) => {
            const valA = a[sortCol] ?? ''
            const valB = b[sortCol] ?? ''
            const numA = Number(valA)
            const numB = Number(valB)

            if (!isNaN(numA) && !isNaN(numB)) {
                return sortDir === 'asc' ? numA - numB : numB - numA
            }
            const strA = String(valA).toLowerCase()
            const strB = String(valB).toLowerCase()
            if (strA < strB) return sortDir === 'asc' ? -1 : 1
            if (strA > strB) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [filteredRows, sortCol, sortDir])

    const totalPages = Math.ceil(sortedRows.length / ROWS_PER_PAGE)
    const pagedRows = sortedRows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE)

    const handleSort = (colIndex) => {
        if (sortCol === colIndex) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortCol(colIndex)
            setSortDir('asc')
        }
    }

    // Editing Handlers
    const startCellEdit = (rowIndex, colIndex, value) => {
        setEditCell({ rowIndex, colIndex })
        setTempValue(String(value ?? ''))
    }

    const saveCellEdit = () => {
        if (!editCell) return
        const { rowIndex, colIndex } = editCell

        // Find the actual row index in the original rows array
        // This is tricky because of sorting/filtering. 
        // We'll use a unique identifier or just map back if we have the original row data.
        // For simplicity, we'll map by finding the row in the source array.
        const updatedRows = [...rows]
        const actualRowIndex = rows.indexOf(sortedRows[page * ROWS_PER_PAGE + rowIndex])

        if (actualRowIndex !== -1) {
            const newRow = [...updatedRows[actualRowIndex]]
            newRow[colIndex] = tempValue
            updatedRows[actualRowIndex] = newRow
            if (typeof setData === 'function') {
                setData({ rows: updatedRows })
            }
        }

        setEditCell(null)
    }

    const downloadCSV = () => {
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `exported_data_${new Date().getTime()}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (!headers.length) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No Data Available</div>
                <div className="empty-state-desc">
                    Load data from Google Sheets or upload an Excel file to get started.
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="toolbar">
                <div className="search-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search across all columns..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        id="data-search-input"
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }}></span>
                        Auto-saved to Browser
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={downloadCSV} title="Download as CSV file">
                        📥 Download CSV
                    </button>
                    <span className="section-badge">
                        {filteredRows.length} rows
                    </span>
                </div>
            </div>

            <div className="table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                <table className="data-table" id="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 50 }}>#</th>
                            {sourceLabel && <th>Source</th>}
                            {headers.map((h, i) => (
                                <th
                                    key={i}
                                    onClick={() => handleSort(i)}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>{h}</span>
                                        {sortCol === i && (
                                            <span style={{ fontSize: '0.7rem' }}>
                                                {sortDir === 'asc' ? '▲' : '▼'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pagedRows.map((row, ri) => (
                            <tr key={ri}>
                                <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                                    {page * ROWS_PER_PAGE + ri + 1}
                                </td>
                                {sourceLabel && (
                                    <td>
                                        <span className={`source-badge ${row._source || 'google'}`}>
                                            {row._source === 'excel' ? '📁 Excel' : '📊 Sheets'}
                                        </span>
                                    </td>
                                )}
                                {headers.map((_, ci) => (
                                    <td
                                        key={ci}
                                        onDoubleClick={() => startCellEdit(ri, ci, row[ci])}
                                        className={editCell?.rowIndex === ri && editCell?.colIndex === ci ? 'editing' : ''}
                                        title="Double click to edit cell"
                                    >
                                        {editCell?.rowIndex === ri && editCell?.colIndex === ci ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    ref={editInputRef}
                                                    className="table-edit-input"
                                                    value={tempValue}
                                                    onChange={e => setTempValue(e.target.value)}
                                                    onBlur={saveCellEdit}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') saveCellEdit()
                                                        if (e.key === 'Escape') setEditCell(null)
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <div style={{ display: 'flex', gap: '2px' }}>
                                                    <button
                                                        className="btn-save-cell"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            saveCellEdit();
                                                        }}
                                                        title="Save (Enter)"
                                                    >
                                                        ✅
                                                    </button>
                                                    <button
                                                        className="btn-cancel-cell"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setEditCell(null);
                                                        }}
                                                        title="Cancel (Esc)"
                                                    >
                                                        ✖️
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <span>{row[ci] ?? ''}</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <span>
                        Showing {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, sortedRows.length)} of {sortedRows.length}
                    </span>
                    <div className="pagination-buttons">
                        <button
                            className="btn btn-outline btn-sm"
                            disabled={page === 0}
                            onClick={() => setPage(0)}
                        >
                            ⟨⟨
                        </button>
                        <button
                            className="btn btn-outline btn-sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ⟨ Prev
                        </button>
                        <span style={{ padding: '0 8px', fontWeight: 600, color: 'var(--color-accent-light)' }}>
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            className="btn btn-outline btn-sm"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next ⟩
                        </button>
                        <button
                            className="btn btn-outline btn-sm"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(totalPages - 1)}
                        >
                            ⟩⟩
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
