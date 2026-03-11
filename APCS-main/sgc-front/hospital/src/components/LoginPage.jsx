
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginHospital } from "../utils/Api";
import "../App.css";

function LoginPage() {
  const [hospitalId, setHospitalId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const user = await loginHospital(hospitalId);

    if (user) {
      localStorage.setItem("hospitalUser", JSON.stringify(user));
      navigate("/dashboard");
    } else {
      setError("Invalid Hospital ID");
    }
  };

  return (
    <div className="login-layout">
      {/* Left Side */}
      <div className="login-info">
        <h1>🚑 Smart Green Corridor</h1>
        <p>
          Save lives with speed — optimize routes for emergency ambulances and
          clear traffic signals intelligently.
        </p>
      </div>

      {/* Right Side */}
      <div className="login-form-container">
        <form className="login-form" onSubmit={handleLogin}>
          <h2>Hospital Login</h2>
          <input
            type="text"
            placeholder="Enter Hospital ID (e.g., H001)"
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            required
          />
          <button type="submit">Login</button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
