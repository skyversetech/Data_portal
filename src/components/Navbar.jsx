import React from 'react'

export default function Navbar({ activeTab, setActiveTab, tabs }) {
    return (
        <nav className="navbar" id="main-navbar">
            <div className="navbar-brand">
                <div className="navbar-logo">📊</div>
                <div>
                    <div className="navbar-title">Data Portal</div>
                    <div className="navbar-subtitle">Timesheet & Data Management</div>
                </div>
            </div>

            <div className="navbar-actions">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        id={`nav-tab-${tab.id}`}
                        className={`navbar-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    )
}
