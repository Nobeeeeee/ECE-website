import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CursorGrid from "../components/CursorGrid";
import SubjectNotesModal from "../components/SubjectNotesModal";
import SmartExpandedPreviewModal from "../components/SmartExpandedPreviewModal";
import {
  subscribeSubjects,
  subscribeAllAssignments,
  subscribeAllNotes,
  subscribeAllFiles,
  saveNoteToFirestore,
  saveFileToFirestore,
  deleteNoteFromFirestore,
  deleteFileFromFirestore,
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

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [language, setLanguage] = useState("English");
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedSubjectMode, setSelectedSubjectMode] = useState("all");
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

  const facName = (currentUser?.name || "").toLowerCase();
  const facId = (currentUser?.identifier || "").toLowerCase();

  const facultyAssignedSubjects = subjects.filter((subject) => {
    const teacher = (subject.assignedTeacher || "").toLowerCase();
    return teacher !== "unassigned" && (teacher === facName || teacher === facId || teacher.includes(facName) || teacher.includes(facId));
  });

  const availableSubjects = facultyAssignedSubjects.length > 0 ? facultyAssignedSubjects : subjects;

  // Faculty Create / Publish Notes Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishSubId, setPublishSubId] = useState("");
  const [publishUnit, setPublishUnit] = useState("Unit 1");
  const [publishNoteType, setPublishNoteType] = useState("Lecture Notes");
  const [publishTitle, setPublishTitle] = useState("");
  const [publishReadTime, setPublishReadTime] = useState("5 mins read • 10 Pages");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishSections, setPublishSections] = useState([
    { heading: "1. Core Principles & Key Concepts", body: "" }
  ]);
  const [uploadFileObj, setUploadFileObj] = useState(null);
  const [uploadFilePreview, setUploadFilePreview] = useState(null);
  const [isPublishingNote, setIsPublishingNote] = useState(false);

  const handleOpenPublishModal = (targetSubId = null, defaultType = "Lecture Notes") => {
    const subId = targetSubId || availableSubjects[0]?.id || subjects[0]?.id || "";
    setPublishSubId(subId);
    setPublishUnit("Unit 1");
    setPublishNoteType(defaultType);
    setPublishTitle("");
    setPublishReadTime("5 mins read • 10 Pages");
    setPublishDescription("");
    setPublishSections([{ heading: "1. Core Principles & Key Concepts", body: "" }]);
    setUploadFileObj(null);
    setUploadFilePreview(null);
    setShowPublishModal(true);
  };

  const handleAddSection = () => {
    setPublishSections((prev) => [
      ...prev,
      { heading: `${prev.length + 1}. Topic / Question Heading`, body: "" }
    ]);
  };

  const handleRemoveSection = (idx) => {
    if (publishSections.length <= 1) return;
    setPublishSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSectionChange = (idx, field, val) => {
    setPublishSections((prev) =>
      prev.map((sec, i) => (i === idx ? { ...sec, [field]: val } : sec))
    );
  };

  const handlePublishNoteSubmit = async (e) => {
    e.preventDefault();
    if (!publishTitle.trim() || isPublishingNote) return;

    const assignedSub = subjects.find((s) => s.id === publishSubId) || availableSubjects[0] || subjects[0];
    if (!assignedSub) {
      alert("Please select a valid course subject.");
      return;
    }

    const unitName = publishUnit.trim() || "Unit 1";
    const validSections = publishSections
      .map((s) => ({
        heading: s.heading.trim() || "Notes Section",
        body: s.body.trim(),
      }))
      .filter((s) => s.body || s.heading);

    if (validSections.length === 0 && !uploadFileObj) {
      alert("Please enter note content or attach a PDF/reference file.");
      return;
    }

    setIsPublishingNote(true);

    let fileDataUrl = null;
    if (uploadFileObj) {
      try {
        fileDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(uploadFileObj);
        });
      } catch (err) {
        console.warn("File read error:", err);
      }
    }

    const newNoteId = `custom_note_${Date.now()}`;
    const newNote = {
      id: newNoteId,
      subjectId: assignedSub.id,
      subjectName: assignedSub.name,
      subjectCode: assignedSub.code || "",
      unit: unitName,
      type: publishNoteType,
      typeTagClass: publishNoteType.includes("2-Mark")
        ? "q2mark"
        : publishNoteType.includes("16") || publishNoteType.includes("13")
        ? "q13mark"
        : publishNoteType.includes("PDF")
        ? "pdf"
        : "lecture",
      title: `${unitName} — ${publishTitle.trim()}`,
      readTime: publishReadTime.trim() || "5 mins read • Printable",
      description: publishDescription.trim() || `Course study notes published by faculty for ${assignedSub.name}.`,
      publishedBy: currentUser?.name || assignedSub.assignedTeacher || "Faculty",
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      sections: validSections.length > 0 ? validSections : [
        {
          heading: publishTitle.trim(),
          body: uploadFileObj ? `Attached Resource File: ${uploadFileObj.name}` : "Comprehensive study materials prepared by assigned faculty.",
        }
      ],
      fileName: uploadFileObj ? uploadFileObj.name : "",
      fileSize: uploadFileObj ? (uploadFileObj.size / (1024 * 1024)).toFixed(2) + " MB" : "",
      fileUrl: fileDataUrl || "",
    };

    try {
      await saveNoteToFirestore(newNote);

      if (uploadFileObj) {
        const newFile = {
          id: `custom_file_${Date.now()}`,
          subjectId: assignedSub.id,
          subjectName: assignedSub.name,
          unit: unitName,
          fileType: publishNoteType,
          fileName: uploadFileObj.name,
          fileSize: (uploadFileObj.size / (1024 * 1024)).toFixed(2) + " MB",
          title: publishTitle.trim(),
          description: publishDescription.trim() || `Reference file uploaded by faculty for ${assignedSub.name}.`,
          uploadedBy: currentUser?.name || assignedSub.assignedTeacher || "Faculty",
          previewUrl: fileDataUrl,
          fileUrl: fileDataUrl,
          isImage: uploadFileObj.type?.startsWith("image/"),
          uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        };
        await saveFileToFirestore(newFile);

        setCustomFiles((prev) => {
          const updatedFiles = [newFile, ...prev.filter((f) => f.id !== newFile.id)];
          try {
            localStorage.setItem("studynotes_custom_files", JSON.stringify(updatedFiles));
          } catch (e) {
            console.error(e);
          }
          return updatedFiles;
        });
      }

      setCustomNotes((prev) => {
        const updatedNotes = [newNote, ...prev.filter((n) => n.id !== newNote.id)];
        try {
          localStorage.setItem("studynotes_custom_notes", JSON.stringify(updatedNotes));
        } catch (e) {
          console.error(e);
        }
        return updatedNotes;
      });

      setShowPublishModal(false);
      alert(`🎉 Published Successfully!\n\nNote "${newNote.title}" is now published and visible to logged-in students in their Student Dashboard.`);
    } catch (err) {
      console.error("Failed to publish note to Firestore:", err);
      alert("Failed to publish note. Please try again: " + (err.message || "Network error"));
    } finally {
      setIsPublishingNote(false);
    }
  };

  const getSubjectAssignmentCount = (subjectId, subjectName, subjectCode) => {
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

  const handleOpenSubject = (subject, mode = "all") => {
    setSelectedSubject(subject);
    setSelectedSubjectMode(mode);
  };

  const facultyCategories = [
    {
      id: "fac_assignments",
      title: language === "English" ? "📝 Manage & Grade Assignments" : "📝 ஒப்படைப்புகளை நிர்வகிக்கவும்",
      description: "Create unit assignments, evaluate student submissions, assign scores, and give feedback",
      badge: "Faculty Tasks",
      action: "assignments",
    },
    {
      id: "fac_add_notes",
      title: language === "English" ? "✏️ Publish Unit Notes & Material" : "✏️ புதிய பாடக் குறிப்புகள் பதிவேற்று",
      description: "Upload unit PDF files, write 2-mark & 16-mark notes, and publish question bank solutions",
      badge: "Publish Notes",
      action: "publish_notes",
    },
    {
      id: "fac_qbank_publisher",
      title: language === "English" ? "❓ Solved Q&A Bank Publisher" : "❓ வினா வங்கி வெளியீட்டாளர்",
      description: "Draft 2-mark short answers & 16-mark university exam solutions for your assigned subject",
      badge: "Question Bank",
      action: "qbank_publisher",
    },
    {
      id: "fac_submissions",
      title: language === "English" ? "📤 Evaluate Student Uploads" : "📤 மாணவர் ஒப்படைப்பு மதிப்பீடு",
      description: "Review uploaded student assignment PDFs, download submissions, and send corrections",
      badge: "Grading Portal",
      action: "assignments",
    },
  ];

  const filteredSubjects = availableSubjects.filter(
    (subject) =>
      subject.name.toLowerCase().includes(search.toLowerCase()) ||
      subject.tamil.toLowerCase().includes(search.toLowerCase()) ||
      (subject.code && subject.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="dashboard-container">
      {/* HEADER NAVBAR */}
      <header className="navbar">
        <div className="navbar-brand" onClick={() => navigate("/faculty")} style={{ cursor: "pointer" }}>
          <div className="brand-logo-icon">👨‍🏫</div>
          <span className="brand-name">Faculty Portal</span>
        </div>

        <nav className="navbar-links">
          <a href="#home">Home</a>
          <a href="#categories">Actions</a>
          <a href="#subjects">Assigned Courses</a>
        </nav>

        <div className="navbar-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search assigned courses, assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="navbar-actions">
          {currentUser ? (
            <div className="user-profile-badge">
              <span className="role-badge faculty">
                👨‍🏫 Faculty: <strong>{currentUser.name || currentUser.identifier}</strong>
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
          <span className="hero-badge">👨‍🏫 Faculty Portal & Course Hub</span>

          <h1>
            Teach Smarter.
            <br />
            <span>Guide Better.</span>
          </h1>

          <p>
            Welcome to your Faculty Portal. Manage course study notes, 2-mark & 16-mark question banks, and lab manuals for your assigned subject.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={() => handleOpenPublishModal()}
              style={{ background: "linear-gradient(135deg, #a855f7, #06b6d4)" }}
            >
              ✍️ Create & Publish Notes
            </button>

            <button
              className="secondary-btn"
              onClick={() => document.getElementById("subjects")?.scrollIntoView({ behavior: "smooth" })}
            >
              ⚡ View Assigned Subjects ({availableSubjects.length})
            </button>
          </div>

          {/* FACULTY METRICS METRIC STATS */}
          <div className="dashboard-metrics-grid" style={{ marginTop: "24px" }}>
            <div className="metric-card">
              <span className="metric-icon">👨‍🏫</span>
              <div className="metric-info">
                <h4>{availableSubjects.length}</h4>
                <p>Assigned Courses</p>
              </div>
            </div>
            <div className="metric-card">
              <span className="metric-icon">📝</span>
              <div className="metric-info">
                <h4>{customAssignments.length}</h4>
                <p>Published Tasks</p>
              </div>
            </div>
            <div className="metric-card">
              <span className="metric-icon">✍️</span>
              <div className="metric-info">
                <h4>{customNotes.length + customFiles.length}</h4>
                <p>Course Notes & Files</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="study-card card-one">
            📖 <span>Lecture Notes</span>
          </div>

          <div className="study-card card-two">
            ⭐ <span>Question Bank</span>
          </div>

          <div className="study-card card-three">
            🎯 <span>Course Ready</span>
          </div>

          <div className="hero-book">📚</div>
        </div>
      </section>

      {/* FACULTY QUICK MANAGEMENT TOOLS */}
      <section className="categories-section" id="categories">
        <div className="section-header">
          <h2>📝 Faculty Management Actions</h2>
          <p>Publish course notes, create unit assignments, and evaluate student uploads.</p>
        </div>

        <div className="categories-grid">
          {facultyCategories.map((category) => (
            <div
              key={category.id}
              className="category-card"
              onClick={() => {
                const targetSub = availableSubjects[0] || subjects[0];
                if (category.id === "fac_add_notes") {
                  handleOpenPublishModal(targetSub?.id, "Lecture Notes");
                } else if (category.id === "fac_qbank_publisher") {
                  handleOpenPublishModal(targetSub?.id, "2-Mark Q&A");
                } else if (targetSub) {
                  handleOpenSubject(targetSub, category.action);
                }
              }}
            >
              <div className="category-header">
                <span className="category-badge">{category.badge}</span>
              </div>

              <h3>{category.title}</h3>
              <p>{category.description}</p>

              <button className="category-btn">
                Open Action Panel →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ASSIGNED SUBJECTS LIST */}
      <section className="subjects-section" id="subjects">
        <div className="section-header">
          <span className="section-tag font-medium text-cyan-400">👨‍🏫 ASSIGNED COURSES & MANAGEMENT</span>
          <h2>Your Assigned ECE Subjects</h2>
          <p>Select a subject to publish study notes, upload lab manuals, create unit assignments, or evaluate submissions.</p>
        </div>

        <div className="subjects-grid">
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((subject) => {
              const assignCount = getSubjectAssignmentCount(subject.id, subject.name, subject.code);
              const pubCount = getSubjectPublishedCount(subject.id, subject.name);

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

                    <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                      <button
                        className="open-notes-btn"
                        style={{ flex: 1, padding: "8px", fontSize: "0.8rem", background: "rgba(168, 85, 247, 0.2)", border: "1px solid rgba(168, 85, 247, 0.4)", color: "#e9d5ff" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSmartPreviewItem(subject);
                        }}
                      >
                        ⚡ Preview
                      </button>

                      <button
                        className="open-notes-btn"
                        style={{ flex: 1, padding: "8px", fontSize: "0.8rem", background: "linear-gradient(135deg, #9333ea, #06b6d4)", border: "none", color: "#ffffff", fontWeight: 600 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPublishModal(subject.id, "Lecture Notes");
                        }}
                      >
                        ✍️ Publish Notes
                      </button>

                      <button className="open-notes-btn" style={{ flex: 1, padding: "8px", fontSize: "0.8rem" }}>
                        Manage Course →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-subjects">
              <p>No assigned subjects found.</p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="brand-logo-icon">📚</div>
            <span className="brand-name">Faculty Portal - StudyNotes</span>
            <p>Course notes management, 2-mark & 16-mark question banks, and student submission evaluations.</p>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} StudyNotes Hub. All rights reserved.
        </div>
      </footer>

      {/* SUBJECT NOTES & ASSIGNMENT MANAGEMENT MODAL */}
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

      {/* FACULTY CREATE & PUBLISH UNIT NOTES MODAL */}
      {showPublishModal && (
        <div className="note-modal-backdrop" onClick={() => !isPublishingNote && setShowPublishModal(false)}>
          <div
            className="note-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <button
              className="modal-close-btn"
              onClick={() => !isPublishingNote && setShowPublishModal(false)}
              disabled={isPublishingNote}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <span style={{ fontSize: "2.4rem" }}>✏️📚</span>
              <div>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", margin: 0, color: "#ffffff" }}>
                  Publish Unit Notes & Study Material
                </h2>
                <span style={{ color: "var(--accent-purple-light)", fontSize: "0.85rem" }}>
                  Draft course lecture notes, solved 2-mark & 16-mark Q&A, or attach PDF documents. Published notes appear immediately on Student Dashboard for enrolled logged-in students.
                </span>
              </div>
            </div>

            <form onSubmit={handlePublishNoteSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* ROW 1: Subject & Unit */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Select Course / Subject *
                  </label>
                  <select
                    className="form-control"
                    value={publishSubId}
                    onChange={(e) => setPublishSubId(e.target.value)}
                    style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.9rem" }}
                    required
                  >
                    {availableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} {sub.code ? `(${sub.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Unit / Chapter *
                  </label>
                  <select
                    className="form-control"
                    value={publishUnit}
                    onChange={(e) => setPublishUnit(e.target.value)}
                    style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.9rem" }}
                  >
                    <option value="Unit 1">Unit 1</option>
                    <option value="Unit 2">Unit 2</option>
                    <option value="Unit 3">Unit 3</option>
                    <option value="Unit 4">Unit 4</option>
                    <option value="Unit 5">Unit 5</option>
                    <option value="Lab Manual">Lab Manual & Experiments</option>
                    <option value="General Reference">General Reference</option>
                  </select>
                </div>
              </div>

              {/* ROW 2: Note Type & Read Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Format / Note Category *
                  </label>
                  <select
                    className="form-control"
                    value={publishNoteType}
                    onChange={(e) => setPublishNoteType(e.target.value)}
                    style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.9rem" }}
                  >
                    <option value="Lecture Notes">📘 Lecture Notes (Core Theory)</option>
                    <option value="2-Mark Q&A">❓ 2-Mark Short Questions & Answers</option>
                    <option value="16-Mark Problem">📄 16-Mark University Exam Solutions</option>
                    <option value="Lab Manual">🧪 Lab Manual & Practical Procedure</option>
                    <option value="Formula Summary">📑 Complete Unit Summary / Formula Sheet</option>
                    <option value="PDF Document">📂 PDF Document / Reference Resource</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Reading Estimate / Page Count
                  </label>
                  <input
                    type="text"
                    value={publishReadTime}
                    onChange={(e) => setPublishReadTime(e.target.value)}
                    placeholder="e.g. 5 mins read • 10 Pages"
                    style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              {/* ROW 3: Topic / Note Title */}
              <div className="form-group">
                <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                  Note Topic / Main Title *
                </label>
                <input
                  type="text"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="e.g. 8086 Architecture, Bus Interface Unit & Execution Unit"
                  style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.9rem" }}
                  required
                />
              </div>

              {/* ROW 4: Overview Description */}
              <div className="form-group">
                <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                  Overview / Brief Summary (Optional)
                </label>
                <input
                  type="text"
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  placeholder="e.g. Covers BIU & EU architecture, register organisation, and flag register flags with diagram."
                  style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.9rem" }}
                />
              </div>

              {/* DYNAMIC SECTIONS / QUESTION CONTENT */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ color: "var(--accent-cyan)", fontSize: "0.9rem", fontWeight: 600 }}>
                    📝 Note Content & Question Sections ({publishSections.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      color: "#38bdf8",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ➕ Add Section / Q&A
                  </button>
                </div>

                {publishSections.map((sec, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "12px",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                      <input
                        type="text"
                        value={sec.heading}
                        onChange={(e) => handleSectionChange(idx, "heading", e.target.value)}
                        placeholder={`Section ${idx + 1} Heading / Question`}
                        style={{
                          flex: 1,
                          background: "rgba(0,0,0,0.3)",
                          color: "#38bdf8",
                          fontWeight: 600,
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          fontSize: "0.88rem",
                        }}
                      />
                      {publishSections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(idx)}
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "#f87171",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={4}
                      value={sec.body}
                      onChange={(e) => handleSectionChange(idx, "body", e.target.value)}
                      placeholder="Write notes, derivations, bullet points, sample exam answer, or code snippets here..."
                      style={{
                        width: "100%",
                        background: "rgba(0,0,0,0.3)",
                        color: "#ffffff",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: "0.88rem",
                        lineHeight: 1.5,
                        resize: "vertical",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* ATTACH REFERENCE PDF / FILE */}
              <div style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px dashed rgba(56, 189, 248, 0.3)", borderRadius: "12px", padding: "14px" }}>
                <label style={{ display: "block", color: "var(--accent-cyan)", fontSize: "0.88rem", fontWeight: 600, marginBottom: "6px" }}>
                  📎 Attach Unit PDF File or Reference Photo (Optional)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <input
                    type="file"
                    accept=".pdf,image/*,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setUploadFileObj(f);
                        setUploadFilePreview(URL.createObjectURL(f));
                      }
                    }}
                    style={{ color: "#ffffff", fontSize: "0.85rem" }}
                  />
                  {uploadFileObj && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(16, 185, 129, 0.15)", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                      <span style={{ color: "#a7f3d0", fontSize: "0.82rem" }}>
                        📄 {uploadFileObj.name} ({(uploadFileObj.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFileObj(null);
                          setUploadFilePreview(null);
                        }}
                        style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE PUBLISH INFO BANNER */}
              <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.2rem" }}>🟢</span>
                <span style={{ fontSize: "0.82rem", color: "#a7f3d0" }}>
                  <strong>Real-Time Student Publishing:</strong> Once published, students who are logged in will instantly see this note in their Student Dashboard and will be able to read and download formatted PDF study material.
                </span>
              </div>

              {/* MODAL ACTION BUTTONS */}
              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isPublishingNote}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #9333ea, #06b6d4)",
                    padding: "12px",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    opacity: isPublishingNote ? 0.7 : 1,
                    cursor: isPublishingNote ? "not-allowed" : "pointer",
                  }}
                >
                  {isPublishingNote ? "⏳ Publishing Note to Students..." : "🚀 Publish Note to Students"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isPublishingNote}
                  onClick={() => setShowPublishModal(false)}
                  style={{ padding: "12px 20px" }}
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
