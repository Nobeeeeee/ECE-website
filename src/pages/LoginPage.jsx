import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AeroShards from "../components/AeroShards";
import "../components/Login.css";

function LoginPage({ onClose, onLoginSuccess }) {
  const navigate = useNavigate();
  const { loginUser, registerUser } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false); // false = Sign In, true = Create Account
  const [role, setRole] = useState("student");

  const [fullName, setFullName] = useState("");
  const [subjectCode, setSubjectCode] = useState(""); // Subject Code for faculty
  const [identifier, setIdentifier] = useState(""); // regNo for student, subjectName for faculty
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/");
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (role === "faculty" && !subjectCode.trim()) {
        throw new Error("Please enter the Subject Code.");
      }
      if (!identifier.trim() || !password) {
        throw new Error("Please fill in all required fields.");
      }

      let user;

      if (isSignUp) {
        // Validation for Sign Up / Account Creation
        if (!fullName.trim()) {
          throw new Error("Please enter your full name.");
        }
        if (password.length < 4) {
          throw new Error("Password must be at least 4 characters long.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match. Please check and try again.");
        }

        user = await registerUser({
          name: fullName,
          role,
          identifier,
          password,
        });
      } else {
        // Sign In
        user = await loginUser({
          role,
          identifier,
          subjectCode,
          password,
        });
      }

      if (onLoginSuccess) {
        onLoginSuccess(user);
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const switchTabMode = (signUpState) => {
    setIsSignUp(signUpState);
    setError("");
    setFullName("");
    setSubjectCode("");
    setIdentifier("");
    setPassword("");
    setConfirmPassword("");
  };

  const changeRole = (newRole) => {
    setRole(newRole);
    if (newRole === "faculty") {
      setIsSignUp(false);
    }
    setError("");
    setSubjectCode("");
    setIdentifier("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="login-overlay">
      {/* Background Interactive AeroShards */}
      <AeroShards
        backgroundColor="#0b0f19"
        shardColor="#8b5cf6"
        accentColor="#06b6d4"
        density={1.3}
        shardSize={1.1}
        speed={1.0}
        interaction="repel"
      />

      <div className="login-modal">
        {/* CLOSE BUTTON */}
        <button
          type="button"
          className="login-close"
          onClick={handleClose}
          aria-label="Close login modal"
        >
          ✕
        </button>

        {/* BRAND TITLE */}
        <div className="login-header">
          <div className="login-logo-badge">📚</div>
          <h2>StudyNotes</h2>
          <p className="login-subtitle">
            {isSignUp
              ? "Create a new account to get started"
              : "Sign in to access study materials & notes"}
          </p>
        </div>

        {/* ROLE TABS */}
        <div className="login-tabs">
          <button
            type="button"
            className={role === "student" ? "active" : ""}
            onClick={() => changeRole("student")}
          >
            🎓 Student
          </button>

          <button
            type="button"
            className={role === "faculty" ? "active" : ""}
            onClick={() => changeRole("faculty")}
          >
            👨‍🏫 Faculty
          </button>
        </div>

        {/* FORM */}
        <form className="login-form" onSubmit={handleAuthSubmit}>
          {/* Full Name field (Sign Up only) */}
          {isSignUp && (
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Subject Code field (Faculty only - placed above Subject Name) */}
          {role === "faculty" && (
            <div className="form-group">
              <label>Subject Code</label>
              <div className="input-wrapper">
                <span className="input-icon">🏷️</span>
                <input
                  type="text"
                  placeholder="e.g. EC8701 / PH3151"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Subject Name for faculty, Register Number for student */}
          <div className="form-group">
            <label>{role === "student" ? "Register Number" : "Subject Name"}</label>
            <div className="input-wrapper">
              <span className="input-icon">
                {role === "student" ? "🆔" : "📘"}
              </span>
              <input
                type="text"
                placeholder={
                  role === "student"
                    ? "e.g. 710021106001"
                    : "e.g. Wireless Communication / Engineering Physics"
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete={role === "student" ? "username" : "off"}
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          {/* Confirm Password field (Sign Up only) */}
          {isSignUp && (
            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔑</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading
              ? "Please wait..."
              : isSignUp
              ? `Register as ${role.charAt(0).toUpperCase() + role.slice(1)} →`
              : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)} →`}
          </button>
        </form>

        {/* ERROR MSG */}
        {error && <div className="login-error">⚠️ {error}</div>}

        {/* SWITCH REGISTER / SIGN IN FOOTER LINK (Students Only) */}
        {role !== "faculty" && (
          <div className="login-footer-register">
            {!isSignUp ? (
              <p>
                Don't have an account?{" "}
                <button type="button" onClick={() => switchTabMode(true)}>
                  Create Account / Register
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button type="button" onClick={() => switchTabMode(false)}>
                  Sign In
                </button>
              </p>
            )}
          </div>
        )}

        <div className="login-footer-hint">
          <p>Protected by ECE StudyNotes Academic Access control.</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
