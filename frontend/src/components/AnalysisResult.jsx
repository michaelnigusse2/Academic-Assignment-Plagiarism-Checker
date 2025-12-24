import React, { useState, useEffect } from 'react';
import { analyzeAssignment } from '../api';

const AnalysisResult = ({ assignmentId }) => {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (assignmentId) {
            fetchAnalysis();
        }
    }, [assignmentId]);

    const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await analyzeAssignment(assignmentId);
            setResults(data);
        } catch (err) {
            setError('Failed to analyze assignment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!assignmentId) return null;

    return (
        <div className="card">
            <h2>2. Analysis Results</h2>

            {loading && <p>Analyzing assignment with AI (this may take a moment)...</p>}

            {error && (
                <div>
                    <p className="error">{error}</p>
                    <button onClick={fetchAnalysis}>Retry</button>
                </div>
            )}

            {results && !loading && (
                <div className="results-container">
                    <div className="result-item">
                        <strong>Topic:</strong> {results.topic}
                    </div>

                    <div className="result-item">
                        <strong>Academic Level:</strong> {results.academic_level}
                    </div>

                    <div className="result-item">
                        <strong>Plagiarism Likelihood:</strong>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar"
                                style={{ width: `${results.plagiarism_score * 100}%` }}
                            ></div>
                        </div>
                        <span>{(results.plagiarism_score * 100).toFixed(1)}%</span>
                    </div>

                    <div className="result-item">
                        <h3>Research Suggestions via RAG</h3>
                        {results.research_suggestions && results.research_suggestions.length > 0 ? (
                            <ul className="suggestions-list">
                                {results.research_suggestions.map((suggestion, index) => (
                                    <li key={index} className="suggestion-item">
                                        {/* Handle both string suggestions (legacy) and object suggestions (new) */}
                                        {typeof suggestion === 'string' ? (
                                            suggestion
                                        ) : (
                                            <div>
                                                <div className="suggestion-title">{suggestion.source_title}</div>
                                                <div className="suggestion-reason">{suggestion.reason}</div>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No specific suggestions found based on available academic sources.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisResult;
