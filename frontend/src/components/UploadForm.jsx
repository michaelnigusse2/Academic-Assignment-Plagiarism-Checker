import React, { useState } from 'react';
import { uploadAssignment } from '../api';

const UploadForm = ({ onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file to upload.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await uploadAssignment(file);
            onUploadSuccess(data.id);
        } catch (err) {
            setError('Failed to upload file. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>1. Upload Assignment</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={loading}
                    />
                </div>

                {error && <div className="error">{error}</div>}

                <button type="submit" disabled={loading || !file}>
                    {loading ? 'Uploading...' : 'Upload PDF'}
                </button>
            </form>
        </div>
    );
};

export default UploadForm;
