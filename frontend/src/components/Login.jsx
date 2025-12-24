import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setToken } from "../auth";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = await login(email, password);
            setToken(data.access_token);
            navigate("/"); // Redirect to dashboard
        } catch (err) {
            setError("Login failed. Check your credentials.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card" style={{ maxWidth: "400px", margin: "2rem auto" }}>
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: ".5rem" }}>Email</label>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ width: "100%", padding: ".5rem" }}
                        disabled={loading}
                    />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: ".5rem" }}>Password</label>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ width: "100%", padding: ".5rem" }}
                        disabled={loading}
                    />
                </div>

                {error && <div className="error">{error}</div>}

                <button type="submit" disabled={loading} style={{ width: "100%" }}>
                    {loading ? "Logging in..." : "Login"}
                </button>

                <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
                    Don't have an account? <a href="/register" style={{ color: "var(--accent-color)", textDecoration: "none" }}>Sign Up</a>
                </p>
            </form>
        </div>
    );
}
