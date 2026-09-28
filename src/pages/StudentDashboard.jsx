import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CursorGrid from "../components/CursorGrid";
import SubjectNotesModal from "../components/SubjectNotesModal";
import SmartExpandedPreviewModal from "../components/SmartExpandedPreviewModal";
import { autoTranslateToTamil } from "../utils/tamilTranslator";
import {
  subscribeSubjects,
  subscribeAllAssignments,
  subscribeAllNotes,
  subscribeAllFiles,
  saveSubjectToFirestore,
} from "../services/firestoreService";
import "../App.css";


const sanitizeSubjects = (list) => {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set();
  const seenKeys = new Set();
  const result = [];

  for (const s of list) {
    if (!s || !s.id) continue;
    if (s.id.startsWith("_") || s.isSystem || /^sub_[1-9]$/.test(s.id)) continue;
    if (seenIds.has(s.id)) continue;

    const normCode = (s.code || "").trim().toLowerCase();
    const normName = (s.name || "").trim().toLowerCase();
    const key = normCode || normName;

    if (key && seenKeys.has(key)) continue;

    seenIds.add(s.id);
    if (key) seenKeys.add(key);

    result.push({
      ...s,
      assignedTeacher: s.assignedTeacher || "Unassigned",
    });
  }
  return result;
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [language, setLanguage] = useState("English");
  const [search, setSearch] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectViewMode, setSubjectViewMode] = useState("grid");
  const [smartPreviewItem, setSmartPreviewItem] = useState(null);

  // Persistent subjects state
  const [subjects, setSubjects] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_subjects");
      const list = saved ? sanitizeSubjects(JSON.parse(saved)) : [];
      return list.filter((s) => !s.id.startsWith("_") && !/^sub_[1-9]$/.test(s.id));
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("studynotes_subjects", JSON.stringify(subjects));
    } catch (e) {
      console.error("Failed to save subjects to localStorage", e);
    }
  }, [subjects]);

  const getDeletedSubjectIds = () => {
    try {
      return JSON.parse(localStorage.getItem("studynotes_deleted_subject_ids") || "[]");
    } catch (e) {
      return [];
    }
  };

  // Real-time Firestore Subjects Listener
  useEffect(() => {
    const unsub = subscribeSubjects((fsSubs) => {
      if (fsSubs) {
        const deletedIds = getDeletedSubjectIds();
        const activeSubs = fsSubs.filter((s) => !deletedIds.includes(s.id));
        const sanitized = sanitizeSubjects(activeSubs);
        setSubjects(sanitized);
        try {
          localStorage.setItem("studynotes_subjects", JSON.stringify(sanitized));
        } catch (e) {
          console.error("Failed to save subjects to localStorage", e);
        }
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Persistent custom notes state
  const [customNotes, setCustomNotes] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_notes");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("studynotes_custom_notes", JSON.stringify(customNotes));
    } catch (e) {
      console.error("Failed to save custom notes to localStorage", e);
    }
  }, [customNotes]);

  // Persistent custom uploaded files state
  const [customFiles, setCustomFiles] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_files");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("studynotes_custom_files", JSON.stringify(customFiles));
    } catch (e) {
      console.error("Failed to save custom files to localStorage", e);
    }
  }, [customFiles]);

  // Persistent custom assignments state
  const [customAssignments, setCustomAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_assignments");
      const list = saved ? JSON.parse(saved) : [];
      return list.filter((a) => a.id && a.id.startsWith("assignment_"));
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("studynotes_custom_assignments", JSON.stringify(customAssignments));
    } catch (e) {
      console.error("Failed to save custom assignments to localStorage", e);
    }
  }, [customAssignments]);

  // Real-time Firestore Assignments Listener
  useEffect(() => {
    const unsub = subscribeAllAssignments((fsAssigns) => {
      if (fsAssigns && fsAssigns.length > 0) {
        setCustomAssignments((prev) => {
          const map = new Map();
          prev.forEach((a) => map.set(a.id, a));
          fsAssigns.forEach((a) => map.set(a.id, a));
          return Array.from(map.values());
        });
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Real-time Firestore Notes Listener
  useEffect(() => {
    const unsub = subscribeAllNotes((fsNotes) => {
      if (fsNotes && fsNotes.length > 0) {
        setCustomNotes((prev) => {
          const map = new Map();
          prev.forEach((n) => map.set(n.id, n));
          fsNotes.forEach((n) => map.set(n.id, n));
          const list = Array.from(map.values());
          try {
            localStorage.setItem("studynotes_custom_notes", JSON.stringify(list));
          } catch (e) {
            console.error(e);
          }
          return list;
        });
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Real-time Firestore Files Listener
  useEffect(() => {
    const unsub = subscribeAllFiles((fsFiles) => {
      if (fsFiles && fsFiles.length > 0) {
        setCustomFiles((prev) => {
          const map = new Map();
          prev.forEach((f) => map.set(f.id, f));
          fsFiles.forEach((f) => map.set(f.id, f));
          const list = Array.from(map.values());
          try {
            localStorage.setItem("studynotes_custom_files", JSON.stringify(list));
          } catch (e) {
            console.error(e);
          }
          return list;
        });
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const getSubjectAssignmentCount = (subjectId, subjectName, subjectCode) => {
    if (!currentUser) return 0;
    const normName = (subjectName || "").trim().toLowerCase();
    const normCode = (subjectCode || "").trim().toLowerCase();
    return customAssignments.filter((a) => {
      if (a.subjectId === subjectId) return true;
      if (normName && a.subjectName?.trim().toLowerCase() === normName) return true;
      if (normCode && a.subjectCode?.trim().toLowerCase() === normCode) return true;
      return false;
    }).length;
  };

  const getSubjectPublishedCount = (subjectId, subjectName) => {
    if (!currentUser) return 0;
    const targetName = (subjectName || "").trim().toLowerCase();
    const notesCount = customNotes.filter(
      (n) =>
        n.id &&
        n.id.startsWith("custom_note_") &&
        (n.subjectId === subjectId || n.subjectName?.trim().toLowerCase() === targetName)
    ).length;
    const filesCount = customFiles.filter(
      (f) =>
        f.id &&
        f.id.startsWith("custom_file_") &&
        (f.subjectId === subjectId || f.subjectName?.trim().toLowerCase() === targetName)
    ).length;
    return notesCount + filesCount;
  };

  const [selectedSubjectMode, setSelectedSubjectMode] = useState("all");

  const handleOpenSubject = (subject, mode = "all") => {
    setSelectedSubject(subject);
    setSelectedSubjectMode(mode);
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "English" ? "Tamil" : "English"));
  };

  const studentCategories = [
    {
      id: "std_qbank",
      title: language === "English" ? "❓ 2-Mark & 16-Mark Q&A Bank" : "❓ 2-மதிப்பெண் & 16-மதிப்பெண் வினா வங்கி",
      description: "Access unit-wise solved short questions & 16-mark university exam questions",
      badge: "Question Bank",
      action: "qbank",
    },
    {
      id: "std_assignments",
      title: language === "English" ? "📤 Submit Unit Assignments" : "📤 ஒப்படைப்புகள் சமர்ப்பிக்கவும்",
      description: "Upload & submit your unit assignments, track due dates, and check faculty grades & feedback",
      badge: "Assignments",
      action: "assignments",
    },
    {
      id: "std_pdf_notes",
      title: language === "English" ? "📑 Download PDF Study Notes" : "📑 PDF பாடக் குறிப்புகள் பதிவிறக்கவும்",
      description: "Download unit lecture notes & custom study materials generated as formatted PDF files",
      badge: "PDF Downloads",
      action: "pdf_docs",
    },
    {
      id: "std_lab_manuals",
      title: language === "English" ? "🧪 ECE Lab Manuals & Experiments" : "🧪 ECE செய்முறை கையேடுகள்",
      description: "Explore circuit diagrams, lab manual procedures, software codes, and viva questions",
      badge: "Lab Manuals",
      action: "lab_manuals",
    },
  ];

  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.name.toLowerCase().includes(search.toLowerCase()) ||
      subject.tamil.toLowerCase().includes(search.toLowerCase()) ||
      (subject.code && subject.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="dashboard-container">
      {/* HEADER NAVBAR */}
      <header className="navbar">
        <div className="navbar-brand" onClick={() => navigate("/student")} style={{ cursor: "pointer" }}>
          <div className="brand-logo-icon">📚</div>
          <span className="brand-name">StudyNotes</span>
        </div>

        <nav className="navbar-links">
          <a href="#home">Home</a>
          <a href="#categories">Resources</a>
          <a href="#subjects">Subjects</a>
        </nav>

        <div className="navbar-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={language === "English" ? "Search ECE subjects, notes..." : "பாடங்கள், குறிப்புகளைத் தேடுக..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="navbar-actions">
          <button className="lang-toggle-btn" onClick={toggleLanguage}>
            🌐 {language}
          </button>

          {currentUser ? (
            <div className="user-profile-badge">
              <span className="role-badge student">
                🎓 Student: <strong>{currentUser.name || currentUser.identifier}</strong>
              </span>
              <button className="logout-btn" onClick={logout}>Logout 🚪</button>
            </div>
          ) : (
            <button className="login-nav-btn" onClick={() => navigate("/login")}>
              Login / Register →
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section" id="home">
        <div className="hero-cursor-grid">
          <CursorGrid />
        </div>

        <div className="hero-content">
          <span className="hero-badge">🎓 Student Academic Portal & Hub</span>

          <h1>
            Study Smarter.
            <br />
            <span>Excel Faster.</span>
          </h1>

          <p>
            Welcome to your Student Dashboard. Explore unit study notes, download lab manuals, track assignment deadlines, and upload submissions.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={() => document.getElementById("subjects")?.scrollIntoView({ behavior: "smooth" })}
            >
              📚 Explore Subjects
            </button>

            <button
              className="secondary-btn"
              onClick={() => document.getElementById("subjects")?.scrollIntoView({ behavior: "smooth" })}
            >
              ⚡ View Enrolled Subjects ({subjects.length})
            </button>
          </div>

          {/* STUDENT METRICS STATS GRID */}
          <div className="dashboard-metrics-grid" style={{ marginTop: "24px" }}>
            <div className="metric-card">
              <span className="metric-icon">📚</span>
              <div className="metric-info">
                <h4>{subjects.length}</h4>
                <p>Enrolled Subjects</p>
              </div>
            </div>
            <div className="metric-card">
              <span className="metric-icon">📝</span>
              <div className="metric-info">
                <h4>{customAssignments.length}</h4>
                <p>Unit Assignments</p>
              </div>
            </div>
            <div className="metric-card">
              <span className="metric-icon">📖</span>
              <div className="metric-info">
                <h4>{customNotes.length + customFiles.length}</h4>
                <p>Study Materials</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="study-card card-one">
            📖 <span>PDF Notes</span>
          </div>

          <div className="study-card card-two">
            ⭐ <span>Important Qs</span>
          </div>

          <div className="study-card card-three">
            🎯 <span>Exams Ready</span>
          </div>

          <div className="hero-book">📚</div>
        </div>
      </section>

      {/* STUDENT CATEGORIES & QUICK ACTIONS */}
      <section className="categories-section" id="categories">
        <div className="section-header">
          <h2>🎯 Quick Student Resources</h2>
          <p>Quickly access solved question banks, assignments, PDF notes, and lab manuals.</p>
        </div>

        <div className="categories-grid">
          {studentCategories.map((category) => (
            <div
              key={category.id}
              className="category-card"
              onClick={() => {
                const targetSub = subjects[0];
                if (targetSub) handleOpenSubject(targetSub, category.action);
              }}
            >
              <div className="category-header">
                <span className="category-badge">{category.badge}</span>
              </div>

              <h3>{category.title}</h3>
              <p>{category.description}</p>

              <button className="category-btn">
                Open Resource →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ECE CURRICULUM SUBJECTS GRID SECTION */}
      <section className="subjects-section" id="subjects">
        <div className="section-header">
          <span className="section-tag font-medium text-cyan-400">📚 ECE CURRICULUM & SUBJECTS</span>
          <h2>ECE Department Subjects</h2>
          <p>Explore unit study notes, question banks, lab manuals, and assignments for your enrolled subjects.</p>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                background: subjectViewMode === "grid" ? "linear-gradient(135deg, #a855f7, #06b6d4)" : "rgba(255,255,255,0.05)",
                color: "#ffffff",
                borderColor: subjectViewMode === "grid" ? "#a855f7" : "rgba(255,255,255,0.1)",
                boxShadow: subjectViewMode === "grid" ? "0 4px 15px rgba(168, 85, 247, 0.4)" : "none"
              }}
              onClick={() => setSubjectViewMode("grid")}
            >
              📱 Standard Grid
            </button>
            <button
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                background: subjectViewMode === "expanded" ? "linear-gradient(135deg, #a855f7, #06b6d4)" : "rgba(255,255,255,0.05)",
                color: "#ffffff",
                borderColor: subjectViewMode === "expanded" ? "#a855f7" : "rgba(255,255,255,0.1)",
                boxShadow: subjectViewMode === "expanded" ? "0 4px 15px rgba(168, 85, 247, 0.4)" : "none"
              }}
              onClick={() => setSubjectViewMode("expanded")}
            >
              ⚡ Smart Expanded Preview Mode
            </button>
          </div>
        </div>

        <div className={subjectViewMode === "expanded" ? "subjects-expanded-list" : "subjects-grid"}>
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((subject) => {
              const assignCount = getSubjectAssignmentCount(subject.id, subject.name, subject.code);
              const pubCount = getSubjectPublishedCount(subject.id, subject.name);

              if (subjectViewMode === "expanded") {
                const units = subject.units || ["Unit 1: Fundamentals", "Unit 2: Core Theory", "Unit 3: Applications"];

                return (
                  <div key={subject.id} className="subject-card expanded-mode">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ fontSize: "2.8rem" }}>{subject.icon}</div>
                        <div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {subject.code && <span className="subject-code-pill">{subject.code}</span>}
                            <h3 style={{ margin: 0, fontSize: "1.4rem" }}>{language === "English" ? subject.name : subject.tamil}</h3>
                          </div>
                          <div style={{ color: "#a7f3d0", fontSize: "0.85rem", marginTop: "4px" }}>
                            👨‍🏫 Faculty: <strong>{subject.assignedTeacher || "Unassigned"}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button className="open-notes-btn" onClick={() => setSmartPreviewItem(subject)}>
                          ⚡ Smart Expanded Preview
                        </button>
                        <button className="open-notes-btn primary" onClick={() => handleOpenSubject(subject)}>
                          📖 Open Subject Notes →
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "14px" }}>
                      {units.map((u, idx) => (
                        <div key={idx} style={{ background: "rgba(255,255,255,0.04)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--accent-cyan)", display: "block" }}>Unit {idx + 1} Topic</span>
                          <strong style={{ fontSize: "0.9rem" }}>{u}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div className="subject-card" key={subject.id} onClick={() => handleOpenSubject(subject, "all")}>
                  <div className="subject-top-row">
                    <div className="subject-icon">{subject.icon}</div>
                  </div>

                  <div className="subject-info">
                    <h3>{language === "English" ? subject.name : subject.tamil}</h3>
                    
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", margin: "4px 0 8px 0", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        📚 {pubCount} Note{pubCount === 1 ? "" : "s"}
                      </span>
                      <span style={{ fontSize: "0.82rem", color: "#38bdf8", fontWeight: 600 }}>
                        📝 {assignCount} Assignment{assignCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="teacher-assignment-container" onClick={(e) => e.stopPropagation()}>
                      <span className="teacher-label">👨‍🏫 Faculty:</span>
                      <span className="teacher-name">{subject.assignedTeacher || "Unassigned"}</span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button
                        className="open-notes-btn"
                        style={{ flex: 1, padding: "8px", fontSize: "0.8rem", background: "rgba(168, 85, 247, 0.2)", border: "1px solid rgba(168, 85, 247, 0.4)", color: "#e9d5ff" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSmartPreviewItem(subject);
                        }}
                      >
                        ⚡ Smart Expanded Preview
                      </button>

                      <button className="open-notes-btn" style={{ flex: 1 }}>
                        View Notes & Resources →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-subjects">
              <p>No subjects found matching your search term.</p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="brand-logo-icon">📚</div>
            <span className="brand-name">StudyNotes Hub</span>
            <p>Empowering ECE students with unit study notes, solved question banks, lab manuals, and online assignment uploads.</p>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} StudyNotes Hub. All rights reserved.
        </div>
      </footer>

      {/* SUBJECT NOTES MODAL */}
      {selectedSubject && (
        <SubjectNotesModal
          subject={selectedSubject}
          initialMode={selectedSubjectMode}
          onClose={() => setSelectedSubject(null)}
          currentUser={currentUser}
          navigate={navigate}
          onUpdateNotes={setCustomNotes}
          onUpdateFiles={setCustomFiles}
          onUpdateAssignments={setCustomAssignments}
        />
      )}

      {/* SMART PREVIEW MODAL */}
      {smartPreviewItem && (
        <SmartExpandedPreviewModal
          item={smartPreviewItem}
          onClose={() => setSmartPreviewItem(null)}
          onOpenSubjectModal={(sub, mode) => {
            setSmartPreviewItem(null);
            handleOpenSubject(sub, mode);
          }}
        />
      )}
    </div>
  );
}
