import React, { useState } from 'react';
import UploadForm from './UploadForm';
import AnalysisResult from './AnalysisResult';

export default function Dashboard({ onLogout }) {
    const [currentAssignmentId, setCurrentAssignmentId] = useState(null);

    const handleUploadSuccess = (id) => {
        setCurrentAssignmentId(id);
    };

    return (
        <>
            <header className="app-header">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button
                        onClick={onLogout}
                        style={{
                            background: '#e74c3c',
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem'
                        }}
                    >
                        Logout
                    </button>
                </div>
                <h1>Academic Assignment Helper</h1>
                <p>AI-Powered Analysis & Research Tool</p>
            </header>

            <main className="main-content">
                <UploadForm onUploadSuccess={handleUploadSuccess} />

                {currentAssignmentId && (
                    <AnalysisResult assignmentId={currentAssignmentId} />
                )}
            </main>

            <footer className="app-footer">
                <p>&copy; 2025 Academic Helper Inc.</p>
            </footer>
        </>
    );
}
