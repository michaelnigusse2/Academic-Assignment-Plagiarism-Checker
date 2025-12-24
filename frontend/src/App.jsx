import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { logout, getToken } from './auth';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import './index.css';

// Protected Route wrapper
function ProtectedRoute({ children }) {
    const token = getToken();
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function App() {
    const handleLogout = () => {
        logout();
        window.location.href = "/login";
    };

    return (
        <BrowserRouter>
            <div className="app-container">
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Dashboard onLogout={handleLogout} />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

function LoginPage() {
    return (
        <>
            <header className="app-header">
                <h1>Academic Assignment Helper</h1>
                <p>Please log in to continue</p>
            </header>
            <Login />
        </>
    );
}

function RegisterPage() {
    return (
        <>
            <header className="app-header">
                <h1>Academic Assignment Helper</h1>
                <p>Create your account</p>
            </header>
            <Register />
        </>
    );
}

export default App;
