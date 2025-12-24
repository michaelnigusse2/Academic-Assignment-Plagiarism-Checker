import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register, login, setToken } from "../auth";

export default function Register() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        // Validation
        if (!fullName || !email || !password || !confirmPassword) {
            setError("All fields are required");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            // Register
            await register(email, password, fullName);

            // Auto-login after successful registration
            const loginData = await login(email, password);
            setToken(loginData.access_token);

            // Redirect to dashboard
            navigate("/");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card" style={{ maxWidth: "400px", margin: "2rem auto" }}>
            <h2>Create Account</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: ".5rem" }}>Full Name</label>
                    <input
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        style={{ width: "100%", padding: ".5rem" }}
                        disabled={loading}
                    />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: ".5rem" }}>Email</label>
                    <input
                        type="email"
                        placeholder="you@example.com"
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

                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: ".5rem" }}>Confirm Password</label>
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={{ width: "100%", padding: ".5rem" }}
                        disabled={loading}
                    />
                </div>

                {error && <div className="error">{error}</div>}

                <button type="submit" disabled={loading} style={{ width: "100%" }}>
                    {loading ? "Creating account..." : "Sign Up"}
                </button>

                <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
                    Already have an account? <a href="/login" style={{ color: "var(--accent-color)" }}>Login</a>
                </p>
            </form>
        </div>
    );
}
