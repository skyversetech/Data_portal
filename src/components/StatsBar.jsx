import React from 'react'

export default function StatsBar({ googleData, excelData }) {
    const googleRows = googleData.rows?.length || 0
    const googleCols = googleData.headers?.length || 0
    const excelRows = excelData.rows?.length || 0
    const excelCols = excelData.headers?.length || 0
    const totalRows = googleRows + excelRows

    return (
        <div className="stats-grid">
            <div className="stat-card accent" id="stat-google-rows">
                <div className="stat-card-label">Google Sheet Rows</div>
                <div className="stat-card-value">{googleRows.toLocaleString()}</div>
                <div className="stat-card-sub">{googleCols} columns loaded</div>
            </div>
            <div className="stat-card success" id="stat-excel-rows">
                <div className="stat-card-label">Excel Rows</div>
                <div className="stat-card-value">{excelRows.toLocaleString()}</div>
                <div className="stat-card-sub">{excelCols} columns loaded</div>
            </div>
            <div className="stat-card warning" id="stat-total">
                <div className="stat-card-label">Total Records</div>
                <div className="stat-card-value">{totalRows.toLocaleString()}</div>
                <div className="stat-card-sub">Combined from all sources</div>
            </div>
            <div className="stat-card info" id="stat-sources">
                <div className="stat-card-label">Data Sources</div>
                <div className="stat-card-value">
                    {(googleRows > 0 ? 1 : 0) + (excelRows > 0 ? 1 : 0)}
                </div>
                <div className="stat-card-sub">
                    {googleRows > 0 && excelRows > 0
                        ? 'Google Sheets + Excel'
                        : googleRows > 0
                            ? 'Google Sheets'
                            : excelRows > 0
                                ? 'Excel'
                                : 'No data loaded'}
                </div>
            </div>
        </div>
    )
}
