import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AeroShards from "../components/AeroShards";
import { autoTranslateToTamil } from "../utils/tamilTranslator";
import {
  subscribeSubjects,
  saveSubjectToFirestore,
  deleteSubjectFromFirestore,
  createOrUpdateFacultyInFirestore,
} from "../services/firestoreService";
import "../components/Login.css";

const INITIAL_SUBJECTS = [
  {
    id: "sub_1",
    name: "Engineering Physics",
    tamil: "பொறியியல் இயற்பியல்",
    icon: "⚛️",
    notes: 24,
    assignedTeacher: "Unassigned",
  },
  {
    id: "sub_2",
    name: "English",
    tamil: "ஆங்கிலம்",
    icon: "📖",
    notes: 18,
    assignedTeacher: "Unassigned",
  },
  {
    id: "sub_3",
    name: "Python",
    tamil: "பைத்தான்",
    icon: "🐍",
    notes: 32,
    assignedTeacher: "Unassigned",
  },
  {
    id: "sub_4",
    name: "Wireless Communication",
    tamil: "வயர்லெஸ் தொடர்பு",
    icon: "📡",
    notes: 21,
    assignedTeacher: "Unassigned",
  },
  {
    id: "sub_5",
    name: "Analog IC Design",
    tamil: "அனலாக் IC டிசைன்",
    icon: "🔌",
    notes: 16,
    assignedTeacher: "Unassigned",
  },
  {
    id: "sub_6",
    name: "4G & 5G Cellular Tech",
    tamil: "4G & 5G Cellular Tech",
    icon: "📶",
    notes: 28,
    assignedTeacher: "Unassigned",
  },
];

const sanitizeSubjects = (list) => {
  return list.map((s) => ({
    ...s,
    assignedTeacher: s.assignedTeacher || "Unassigned",
  }));
};

function AdminPage() {
  const navigate = useNavigate();
  const { currentUser, users, loginUser, registerUser, logout } = useAuth();

  const facultyUsers = users ? users.filter((u) => u.role === "faculty") : [];

  // Admin login & register form state
  const [isAdminSignUp, setIsAdminSignUp] = useState(false);
  const [adminFullName, setAdminFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Subject management state for Admin view
  const [subjects, setSubjects] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_subjects");
      return saved ? sanitizeSubjects(JSON.parse(saved)) : INITIAL_SUBJECTS;
    } catch (e) {
      return INITIAL_SUBJECTS;
    }
  });

  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubTamil, setNewSubTamil] = useState("");
  const [newSubTeacher, setNewSubTeacher] = useState("");
  const [newSubPassword, setNewSubPassword] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("studynotes_subjects", JSON.stringify(subjects));
    } catch (e) {
      console.error("Failed to save subjects to localStorage", e);
    }
  }, [subjects]);

  // Real-time Firestore Subjects Listener
  useEffect(() => {
    const unsub = subscribeSubjects((fsSubs) => {
      if (fsSubs && fsSubs.length > 0) {
        setSubjects(sanitizeSubjects(fsSubs));
      } else {
        INITIAL_SUBJECTS.forEach((sub) => saveSubjectToFirestore(sub));
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleAdminAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!identifier.trim() || !password) {
        throw new Error("Please enter both email and password.");
      }

      if (isAdminSignUp) {
        if (!adminFullName.trim()) {
          throw new Error("Please enter your full name.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        await registerUser({
          name: adminFullName,
          role: "admin",
          identifier,
          password,
        });
      } else {
        await loginUser({
          role: "admin",
          identifier,
          password,
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Admin authentication failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const code = newSubCode.trim() || `EC${Math.floor(1000 + Math.random() * 9000)}`;
    const pass = newSubPassword.trim() || "faculty123";
    const teacher = newSubTeacher.trim() || "Unassigned";

    const newSub = {
      id: `sub_${Date.now()}`,
      code: code,
      name: newSubName.trim(),
      tamil: newSubTamil.trim() || newSubName.trim(),
      icon: "📚",
      notes: 12,
      assignedTeacher: teacher,
      facultyPassword: pass,
      units: ["Unit 1: Introduction", "Unit 2: Core Principles", "Unit 3: Applications"],
    };

    try {
      await saveSubjectToFirestore(newSub);
      if (teacher !== "Unassigned") {
        await createOrUpdateFacultyInFirestore({
          name: teacher,
          subjectCode: code,
          subjectName: newSub.name,
          password: pass,
        });
      }
    } catch (err) {
      console.warn("Firestore subject add warning:", err);
    }

    setSubjects((prev) => [...prev, newSub]);
    setShowAddSubjectModal(false);
    setNewSubCode("");
    setNewSubName("");
    setNewSubTamil("");
    setNewSubTeacher("");
    setNewSubPassword("");
  };

  // Admin Edit Subject Modal Form State
  const [editingSubject, setEditingSubject] = useState(null);
  const [editSubCode, setEditSubCode] = useState("");
  const [editSubName, setEditSubName] = useState("");
  const [editSubTamil, setEditSubTamil] = useState("");
  const [editSubTeacher, setEditSubTeacher] = useState("");
  const [editSubPassword, setEditSubPassword] = useState("");

  const handleOpenEditSubject = (sub) => {
    setEditingSubject(sub);
    setEditSubCode(sub.code || "");
    setEditSubName(sub.name || "");
    setEditSubTamil(sub.tamil || "");
    setEditSubTeacher(sub.assignedTeacher || "");
    setEditSubPassword(sub.facultyPassword || "faculty123");
  };

  const handleSaveEditSubject = async (e) => {
    e.preventDefault();
    if (!editingSubject || !editSubName.trim()) return;

    const updatedSub = {
      ...editingSubject,
      code: editSubCode.trim() || editingSubject.code,
      name: editSubName.trim(),
      tamil: editSubTamil.trim() || editSubName.trim(),
      assignedTeacher: editSubTeacher.trim() || "Unassigned",
      facultyPassword: editSubPassword.trim() || editingSubject.facultyPassword || "faculty123",
    };

    try {
      await saveSubjectToFirestore(updatedSub);
      if (updatedSub.assignedTeacher !== "Unassigned") {
        await createOrUpdateFacultyInFirestore({
          name: updatedSub.assignedTeacher,
          subjectCode: updatedSub.code,
          subjectName: updatedSub.name,
          password: updatedSub.facultyPassword,
        });
      }
    } catch (err) {
      console.warn("Firestore subject edit warning:", err);
    }

    setSubjects((prev) =>
      prev.map((s) => (s.id === editingSubject.id ? updatedSub : s))
    );

    setEditingSubject(null);
  };

  const handleDeleteSubject = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove subject "${name}"?`)) {
      try {
        await deleteSubjectFromFirestore(id);
      } catch (err) {
        console.warn("Firestore subject delete warning:", err);
      }
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const isAdminLoggedIn = currentUser && currentUser.role === "admin";

  // IF NOT LOGGED IN AS ADMIN -> SHOW Dedicated Admin Login Portal
  if (!isAdminLoggedIn) {
    return (
      <div className="login-overlay">
        <AeroShards
          backgroundColor="#070a12"
          shardColor="#a855f7"
          accentColor="#06b6d4"
          density={1.4}
          shardSize={1.2}
          speed={1.2}
          interaction="repel"
        />

        <div className="login-modal" style={{ maxWidth: "460px", border: "1px solid rgba(168, 85, 247, 0.45)" }}>
          <button
            type="button"
            className="login-close"
            onClick={() => navigate("/")}
            title="Return to home page"
          >
            ✕
          </button>

          <div className="login-header">
            <div className="login-logo-badge" style={{ filter: "drop-shadow(0 0 15px rgba(168, 85, 247, 0.6))" }}>
              🛡️
            </div>
            <h2 style={{ background: "linear-gradient(135deg, #ffffff 30%, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {isAdminSignUp ? "Create Admin Account" : "Admin Portal"}
            </h2>
            <p className="login-subtitle">
              {isAdminSignUp
                ? "Register a new Administrator account for Firebase"
                : "Restricted Area — Enter administrator credentials to proceed"}
            </p>
          </div>

          <form className="login-form" onSubmit={handleAdminAuthSubmit}>
            {isAdminSignUp && (
              <div className="form-group">
                <label>Administrator Full Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    placeholder="e.g. Dr. HOD / System Admin"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Admin Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">🛡️</span>
                <input
                  type="email"
                  placeholder="admin@studynotes.org"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Admin Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isAdminSignUp ? "new-password" : "current-password"}
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

            {isAdminSignUp && (
              <div className="form-group">
                <label>Confirm Admin Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔑</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter admin password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              style={{ background: "linear-gradient(135deg, #9333ea, #c084fc)" }}
              disabled={loading}
            >
              {loading
                ? "Authenticating..."
                : isAdminSignUp
                ? "Register as Administrator →"
                : "Login as Administrator →"}
            </button>
          </form>

          {error && <div className="login-error">⚠️ {error}</div>}

          {/* REGISTER / SIGN IN TOGGLE LINK FOR ADMIN */}
          <div className="login-footer-register" style={{ marginTop: "16px" }}>
            {!isAdminSignUp ? (
              <p>
                Don't have an admin account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminSignUp(true);
                    setError("");
                  }}
                  style={{ color: "#c084fc" }}
                >
                  Create / Register Admin Account
                </button>
              </p>
            ) : (
              <p>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminSignUp(false);
                    setError("");
                  }}
                  style={{ color: "#c084fc" }}
                >
                  Sign In as Admin
                </button>
              </p>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-cyan)",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.9rem",
              }}
            >
              ← Back to Student / Main Site
            </button>
          </div>
        </div>
      </div>
    );
  }

  // IF LOGGED IN AS ADMIN -> SHOW Full Admin Dashboard Control Panel
  return (
    <div className="dashboard" style={{ minHeight: "100vh", background: "#090d16" }}>
      {/* NAVBAR */}
      <header className="dashboard-navbar" style={{ borderBottom: "1px solid rgba(168, 85, 247, 0.3)" }}>
        <div className="dashboard-logo" onClick={() => navigate("/")}>
          🛡️
          <span>Admin Portal</span>
        </div>

        <nav className="dashboard-nav">
          <a href="#subjects">Subjects Control</a>
          <a href="#system">System Status</a>
        </nav>

        <div className="dashboard-actions">
          <button className="secondary-btn" onClick={() => navigate("/")}>
            🌐 View Main Site
          </button>
          <div className="user-profile-bar">
            <span className="role-badge admin">
              🛡️ Admin: <strong>{currentUser.name || currentUser.identifier}</strong>
            </span>
            <button className="logout-btn" onClick={logout}>
              Logout 🚪
            </button>
          </div>
        </div>
      </header>

      {/* ADMIN HERO HEADER */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 20px" }}>
        <div style={{ background: "rgba(17, 24, 39, 0.7)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "20px", padding: "30px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <span className="hero-badge" style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.4)" }}>
                🛡️ System Administrator Dashboard
              </span>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2.2rem", marginTop: "12px", marginBottom: "8px" }}>
                Welcome, {currentUser.name || "Admin"}
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
                Manage ECE subjects, faculty assignments, study notes, and system access rights.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="primary-btn"
                style={{ background: "linear-gradient(135deg, #9333ea, #c084fc)" }}
                onClick={() => setShowAddSubjectModal(true)}
              >
                ➕ Add New Subject
              </button>
              <button className="secondary-btn" onClick={() => navigate("/")}>
                🌐 Go to Main Website
              </button>
            </div>
          </div>

          {/* METRICS CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "24px" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "18px", borderRadius: "14px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total Managed Subjects</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff", marginTop: "4px" }}>{subjects.length}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "18px", borderRadius: "14px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Registered Faculty</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", marginTop: "4px" }}>{facultyUsers.length}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "18px", borderRadius: "14px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Access Control Level</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#a855f7", marginTop: "10px" }}>Super Admin</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "18px", borderRadius: "14px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>System Status</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#4ade80", marginTop: "10px" }}>🟢 100% Operational</div>
            </div>
          </div>
        </div>

        {/* SUBJECTS MANAGEMENT TABLE / GRID */}
        <div id="subjects" style={{ marginTop: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem" }}>Subject & Faculty Management</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Update assigned teachers or remove curriculum subjects.</p>
            </div>
            <button className="admin-add-sub-btn" onClick={() => setShowAddSubjectModal(true)}>
              ➕ Add Subject
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {subjects.map((subject) => (
              <div
                key={subject.id}
                style={{
                  background: "rgba(17, 24, 39, 0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justify: "space-between",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "2rem" }}>{subject.icon}</span>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#ffffff" }}>{subject.name}</h3>
                      <span style={{ fontSize: "0.82rem", color: "var(--accent-purple-light)" }}>{subject.tamil}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="delete-subject-btn"
                      onClick={() => handleOpenEditSubject(subject)}
                      title="Edit Subject & Faculty (Admin)"
                      style={{ background: "rgba(139, 92, 246, 0.2)", color: "#c084fc", border: "1px solid rgba(139, 92, 246, 0.4)" }}
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-subject-btn"
                      onClick={() => handleDeleteSubject(subject.id, subject.name)}
                      title="Remove Subject"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.25)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>
                    👨‍🏫 Assigned Faculty Teacher:
                  </span>
                  <strong style={{ fontSize: "1rem", color: "var(--accent-cyan)", marginTop: "4px", display: "block" }}>
                    {subject.assignedTeacher || "Unassigned"}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ADD SUBJECT MODAL */}
      {showAddSubjectModal && (
        <div className="note-modal-backdrop" onClick={() => setShowAddSubjectModal(false)}>
          <div className="note-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <button className="modal-close-btn" onClick={() => setShowAddSubjectModal(false)}>
              ✕
            </button>

            <h2 style={{ fontFamily: "var(--font-heading)", marginBottom: "20px" }}>
              ⚡ Add New Subject (Admin)
            </h2>

            <form onSubmit={handleAddSubject} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label>Subject Code</label>
                <div className="input-wrapper">
                  <span className="input-icon">🏷️</span>
                  <input
                    type="text"
                    placeholder="e.g. EC8701 / PH3151"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Subject Name (English)</label>
                <div className="input-wrapper">
                  <span className="input-icon">📘</span>
                  <input
                    type="text"
                    placeholder="e.g. Microprocessors"
                    value={newSubName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSubName(val);
                      setNewSubTamil(autoTranslateToTamil(val));
                    }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tamil Title (Optional)</label>
                <div className="input-wrapper">
                  <span className="input-icon">🌐</span>
                  <input
                    type="text"
                    placeholder="e.g. மைக்ரோபிராசஸர்கள்"
                    value={newSubTamil}
                    onChange={(e) => setNewSubTamil(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Assign Faculty Teacher</label>
                <div className="input-wrapper">
                  <span className="input-icon">👨‍🏫</span>
                  <input
                    type="text"
                    placeholder="e.g. Faculty Name (Optional)"
                    value={newSubTeacher}
                    onChange={(e) => setNewSubTeacher(e.target.value)}
                  />
                </div>
              </div>

              {/* FACULTY LOGIN PASSWORD TEXT BOX */}
              <div className="form-group">
                <label>Faculty Login Password (Set by Admin)</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type="text"
                    placeholder="Set password for assigned faculty (e.g. pass123)"
                    value={newSubPassword}
                    onChange={(e) => setNewSubPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button type="submit" className="primary-btn" style={{ flex: 1 }}>
                  ➕ Save & Add Subject
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAddSubjectModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN EDIT SUBJECT MODAL */}
      {editingSubject && (
        <div className="note-modal-backdrop" onClick={() => setEditingSubject(null)}>
          <div className="note-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <button className="modal-close-btn" onClick={() => setEditingSubject(null)}>
              ✕
            </button>

            <h2 style={{ fontFamily: "var(--font-heading)", marginBottom: "20px" }}>
              ✏️ Edit Subject & Faculty (Admin)
            </h2>

            <form onSubmit={handleSaveEditSubject} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label>Subject Code</label>
                <div className="input-wrapper">
                  <span className="input-icon">🏷️</span>
                  <input
                    type="text"
                    placeholder="e.g. EC8701 / PH3151"
                    value={editSubCode}
                    onChange={(e) => setEditSubCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Subject Name (English)</label>
                <div className="input-wrapper">
                  <span className="input-icon">📘</span>
                  <input
                    type="text"
                    placeholder="e.g. Microprocessors"
                    value={editSubName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditSubName(val);
                      setEditSubTamil(autoTranslateToTamil(val));
                    }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tamil Title (Optional)</label>
                <div className="input-wrapper">
                  <span className="input-icon">🌐</span>
                  <input
                    type="text"
                    placeholder="e.g. மைக்ரோபிராசஸர்கள்"
                    value={editSubTamil}
                    onChange={(e) => setEditSubTamil(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Assign Faculty Teacher</label>
                <div className="input-wrapper">
                  <span className="input-icon">👨‍🏫</span>
                  <input
                    type="text"
                    placeholder="e.g. Faculty Name (Optional)"
                    value={editSubTeacher}
                    onChange={(e) => setEditSubTeacher(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Faculty Login Password (Set by Admin)</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type="text"
                    placeholder="Set password for assigned faculty (e.g. pass123)"
                    value={editSubPassword}
                    onChange={(e) => setEditSubPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button type="submit" className="primary-btn" style={{ flex: 1 }}>
                  💾 Save Changes
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setEditingSubject(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
