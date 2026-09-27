import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CursorGrid from "../components/CursorGrid";
import SubjectNotesModal from "../components/SubjectNotesModal";
import SmartExpandedPreviewModal from "../components/SmartExpandedPreviewModal";
import { autoTranslateToTamil } from "../utils/tamilTranslator";
import {
  subscribeSubjects,
  subscribeAllAssignments,
  saveSubjectToFirestore,
  deleteSubjectFromFirestore,
  createOrUpdateFacultyInFirestore,
} from "../services/firestoreService";
import "../App.css";

const INITIAL_SUBJECTS = [
  {
    id: "sub_1",
    name: "Engineering Physics",
    tamil: "பொறியியல் இயற்பியல்",
    icon: "⚛️",
    notes: 24,
    assignedTeacher: "Unassigned",
    units: ["Unit 1: Crystallography", "Unit 2: Quantum Physics", "Unit 3: Fibre Optics"],
  },
  {
    id: "sub_2",
    name: "English",
    tamil: "ஆங்கிலம்",
    icon: "📖",
    notes: 18,
    assignedTeacher: "Unassigned",
    units: ["Unit 1: Professional Communication", "Unit 2: Technical Writing"],
  },
  {
    id: "sub_3",
    name: "Python",
    tamil: "பைத்தான்",
    icon: "🐍",
    notes: 32,
    assignedTeacher: "Unassigned",
    units: ["Unit 1: Data Types & Logic", "Unit 2: Functions & Modules", "Unit 3: OOP"],
  },
  {
    id: "sub_4",
    name: "Wireless Communication",
    tamil: "வயர்லெஸ் தொடர்பு",
    icon: "📡",
    notes: 21,
    assignedTeacher: "Unassigned",
    units: ["Unit 1: Cellular Concepts", "Unit 2: Mobile Radio Propagation"],
  },
  {
    id: "sub_5",
    name: "Analog IC Design",
    tamil: "அனலாக் IC டிசைன்",
    icon: "🔌",
    notes: 16,
    assignedTeacher: "Unassigned",
    units: ["Unit 1: Single Stage Amplifiers", "Unit 2: Differential Amplifiers"],
  },
  {
    id: "sub_6",
    name: "4G & 5G Cellular Tech",
    tamil: "4G & 5G Cellular Tech",
    icon: "📶",
    notes: 28,
    assignedTeacher: "Unassigned",
    units: ["Unit 1: LTE Architecture", "Unit 2: 5G NR Waveforms"],
  },
  {
    id: "sub_7",
    name: "Environmental Science",
    tamil: "சுற்றுச்சூழல் அறிவியல்",
    icon: "🌱",
    notes: 19,
    assignedTeacher: "Unassigned",
    units: ["Unit 1: Ecosystems", "Unit 2: Biodiversity", "Unit 3: Pollution Control"],
  },
  {
    id: "sub_8",
    name: "Computer Networks",
    tamil: "கணினி வலைப்பின்னல்கள்",
    icon: "🌐",
    notes: 35,
    assignedTeacher: "Unassigned",
    units: ["Unit 1: OSI Model", "Unit 2: Routing Algorithms", "Unit 3: Transport Layer"],
  },
  {
    id: "sub_9",
    name: "Digital Signal Processing",
    tamil: "டிஜிட்டல் சிக்னல் பிராசஸிங்",
    icon: "〽️",
    notes: 22,
    assignedTeacher: "Unassigned",
    units: ["Unit 1: Discrete Fourier Transform", "Unit 2: IIR/FIR Filter Design"],
  },
];

const sanitizeSubjects = (list) => {
  return list.map((s) => ({
    ...s,
    assignedTeacher: s.assignedTeacher || "Unassigned",
  }));
};

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, users, logout } = useAuth();

  const facultyUsers = users ? users.filter((u) => u.role === "faculty") : [];

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
      return saved ? sanitizeSubjects(JSON.parse(saved)) : INITIAL_SUBJECTS;
    } catch (e) {
      console.error("Failed to load subjects from localStorage", e);
      return INITIAL_SUBJECTS;
    }
  });

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
        setSubjects((prev) => {
          const map = new Map();
          fsSubs.forEach((s) => map.set(s.id, s));
          prev.forEach((s) => {
            if (!map.has(s.id)) map.set(s.id, s);
          });
          return sanitizeSubjects(Array.from(map.values()));
        });
      } else {
        INITIAL_SUBJECTS.forEach((sub) => saveSubjectToFirestore(sub));
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Admin Add Subject Modal Form State
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubTamil, setNewSubTamil] = useState("");
  const [newSubTeacher, setNewSubTeacher] = useState("");
  const [newSubPassword, setNewSubPassword] = useState("");

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

  const handleOpenEditSubject = (sub, e) => {
    if (e) e.stopPropagation();
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

  const handleDeleteSubject = async (id, name, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove subject "${name}"?`)) {
      try {
        await deleteSubjectFromFirestore(id);
      } catch (err) {
        console.warn("Firestore subject delete warning:", err);
      }
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    }
  };
  const [customNotes, setCustomNotes] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_notes");
      const list = saved ? JSON.parse(saved) : [];
      return list.filter((n) => n.id && n.id.startsWith("custom_note_"));
    } catch (e) {
      console.error("Failed to load custom notes from localStorage", e);
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

  // Persistent custom faculty uploaded files (PDFs, Photos, Lab Manuals) state
  const [customFiles, setCustomFiles] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_files");
      const list = saved ? JSON.parse(saved) : [];
      return list.filter((f) => f.id && f.id.startsWith("custom_file_"));
    } catch (e) {
      console.error("Failed to load custom files from localStorage", e);
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
      console.error("Failed to load custom assignments from localStorage", e);
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

  // Real-time Firestore Assignments Listener across all devices
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

  // Track student's recently viewed subjects
  const [recentlyViewedSubjects, setRecentlyViewedSubjects] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_recently_viewed");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load recently viewed subjects from localStorage", e);
      return [];
    }
  });

  const [selectedSubjectMode, setSelectedSubjectMode] = useState("all");

  const handleOpenSubject = (subject, mode = "all") => {
    setSelectedSubject(subject);
    setSelectedSubjectMode(mode);

    setRecentlyViewedSubjects((prev) => {
      const filtered = prev.filter((s) => s.id !== subject.id);
      const updated = [subject, ...filtered].slice(0, 6);
      try {
        localStorage.setItem("studynotes_recently_viewed", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save recently viewed subjects", e);
      }
      return updated;
    });
  };

  // Derive study notes dynamically: for Faculty, show ONLY notes belonging to their assigned subject(s)
  const isFaculty = currentUser?.role === "faculty";
  const isAdmin = currentUser?.role === "admin";

  const facultyAssignedSubjects = isFaculty
    ? subjects.filter((subject) => {
      const facId = (currentUser.identifier || "").toLowerCase();
      const facName = (currentUser.name || "").toLowerCase();
      const facCode = (currentUser.subjectCode || "").toLowerCase();

      return (
        subject.name.toLowerCase() === facId ||
        subject.name.toLowerCase() === facName ||
        (subject.code && subject.code.toLowerCase() === facCode) ||
        (subject.assignedTeacher && subject.assignedTeacher.toLowerCase() === facName) ||
        (subject.assignedTeacher && subject.assignedTeacher.toLowerCase() === facId)
      );
    })
    : subjects;

  const availableSubjects = !currentUser
    ? INITIAL_SUBJECTS
    : isFaculty
    ? facultyAssignedSubjects
    : subjects;

  const getSubjectPublishedCount = (subjectId, subjectName) => {
    if (!currentUser) return 0;
    const notesCount = customNotes.filter((n) => n.subjectId === subjectId || n.subjectName.toLowerCase() === subjectName.toLowerCase()).length;
    const filesCount = customFiles.filter((f) => f.subjectId === subjectId || f.subjectName.toLowerCase() === subjectName.toLowerCase()).length;
    return notesCount + filesCount;
  };

  const displayRecentNotes = (() => {
    if (!currentUser) {
      return [];
    }
    if (isFaculty) {
      const assignedIds = facultyAssignedSubjects.map((s) => s.id);
      const assignedNames = facultyAssignedSubjects.map((s) => s.name.toLowerCase());

      return customNotes
        .filter((n) => assignedIds.includes(n.subjectId) || assignedNames.includes(n.subjectName.toLowerCase()))
        .map((n) => {
          const sub = subjects.find((s) => s.id === n.subjectId || s.name.toLowerCase() === n.subjectName.toLowerCase()) || facultyAssignedSubjects[0];
          return {
            ...n,
            subjectObj: sub,
            icon: sub?.icon || "📚",
            subject: n.subjectName,
          };
        });
    } else {
      return customNotes.map((n) => {
        const sub = subjects.find((s) => s.id === n.subjectId || s.name.toLowerCase() === n.subjectName.toLowerCase());
        return {
          ...n,
          subjectObj: sub || subjects[0],
          icon: sub?.icon || "📚",
          subject: n.subjectName,
        };
      });
    }
  })();

  // Faculty Combined Create Notes & Upload Files Modal State
  const [createUploadTab, setCreateUploadTab] = useState("write"); // "write" or "upload"
  const [showWriteNoteModal, setShowWriteNoteModal] = useState(false);
  const [writeSubId, setWriteSubId] = useState("");
  const [writeUnit, setWriteUnit] = useState("Unit 1");
  const [writeNoteType, setWriteNoteType] = useState("Lecture Notes");
  const [writeTitle, setWriteTitle] = useState("");
  const [writeReadTime, setWriteReadTime] = useState("6 mins read • 10 Pages");
  const [writeDescription, setWriteDescription] = useState("");
  const [writeSection1Heading, setWriteSection1Heading] = useState("");
  const [writeSection1Body, setWriteSection1Body] = useState("");

  const handleWriteNoteSubmit = (e) => {
    e.preventDefault();

    if (!writeSection1Heading.trim() && !writeSection1Body.trim() && !uploadFileObj) {
      alert("Please provide a topic title, write note content, or attach a file/photo.");
      return;
    }

    const assignedSub = facultyAssignedSubjects[0] || availableSubjects[0] || subjects[0];
    const targetSubjectId = writeSubId || assignedSub.id;
    const targetSubject = subjects.find((s) => s.id === targetSubjectId) || assignedSub;

    const unitName = writeUnit.trim() || "Unit 1";
    const headingText = writeSection1Heading.trim() || (uploadFileObj ? uploadFileObj.name : "Chapter Study Resource");

    const newNote = {
      id: `custom_note_${Date.now()}`,
      subjectId: targetSubject.id,
      subjectName: targetSubject.name,
      unit: unitName,
      type: writeNoteType,
      typeTagClass: writeNoteType.includes("2-Mark")
        ? "q2mark"
        : writeNoteType.includes("13") || writeNoteType.includes("16")
          ? "q13mark"
          : "lecture",
      title: `${unitName} — ${headingText}`,
      readTime: "5 mins read • Printable",
      description: `Study notes created by faculty for ${targetSubject.name}.`,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      sections: [
        {
          heading: headingText,
          body: writeSection1Body.trim() || (uploadFileObj ? `Attached Resource File: ${uploadFileObj.name}` : "Complete course study material created by assigned faculty."),
        },
      ],
    };

    setCustomNotes([newNote, ...customNotes]);

    if (uploadFileObj) {
      const fileName = uploadFileObj.name;
      const fileSizeMB = (uploadFileObj.size / (1024 * 1024)).toFixed(2) + " MB";
      const isImage = uploadFileObj.type?.startsWith("image/") || writeNoteType.includes("Photo");

      const newFile = {
        id: `custom_file_${Date.now()}`,
        subjectId: targetSubject.id,
        subjectName: targetSubject.name,
        unit: unitName,
        fileType: writeNoteType,
        fileName: fileName,
        fileSize: fileSizeMB,
        title: headingText,
        description: writeSection1Body.trim() || `Reference resource uploaded by faculty.`,
        uploadedBy: getFacultyDisplayName(),
        previewUrl: uploadFilePreview,
        isImage: isImage,
        uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };

      setCustomFiles((prev) => [newFile, ...prev]);
    }

    setShowWriteNoteModal(false);

    setWriteSection1Heading("");
    setWriteSection1Body("");
    setUploadFileObj(null);
    setUploadFilePreview(null);

    alert(`✅ Success! Note & resource published successfully for ${targetSubject.name}.`);
  };

  // Faculty Upload File Modal State & Handler
  const [showUploadFileModal, setShowUploadFileModal] = useState(false);
  const [uploadSubId, setUploadSubId] = useState("");
  const [uploadUnit, setUploadUnit] = useState("Unit 1");
  const [uploadFileType, setUploadFileType] = useState("PDF Document");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFileObj, setUploadFileObj] = useState(null);
  const [uploadFilePreview, setUploadFilePreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadFileObj(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadFileSubmit = (e) => {
    e.preventDefault();
    if (!uploadTitle.trim() && !uploadFileObj) {
      alert("Please enter a resource title or select a file to upload.");
      return;
    }

    const assignedSub = facultyAssignedSubjects[0] || availableSubjects[0] || subjects[0];
    const targetSubjectId = uploadSubId || assignedSub.id;
    const targetSubject = subjects.find((s) => s.id === targetSubjectId) || assignedSub;

    const fileName = uploadFileObj ? uploadFileObj.name : "Course_Document.pdf";
    const fileSizeMB = uploadFileObj ? (uploadFileObj.size / (1024 * 1024)).toFixed(2) + " MB" : "1.8 MB";
    const isImage = uploadFileObj?.type?.startsWith("image/") || uploadFileType.includes("Photo");

    const newFile = {
      id: `custom_file_${Date.now()}`,
      subjectId: targetSubject.id,
      subjectName: targetSubject.name,
      unit: uploadUnit,
      fileType: uploadFileType,
      fileName: fileName,
      fileSize: fileSizeMB,
      title: uploadTitle.trim() || fileName,
      description: uploadDescription.trim() || `Reference resource uploaded by faculty.`,
      previewUrl: uploadFilePreview,
      isImage: isImage,
      uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    setCustomFiles([newFile, ...customFiles]);
    setShowUploadFileModal(false);

    setUploadTitle("");
    setUploadDescription("");
    setUploadFileObj(null);
    setUploadFilePreview(null);

    alert(`✅ Success! File "${newFile.title}" uploaded successfully for ${targetSubject.name}.`);
  };

  const studentCategories = [
    {
      id: "std_assignments",
      title: language === "English" ? "📤 Submit Assignments" : "📤 ஒப்படைப்புகள் சமர்ப்பிக்கவும்",
      description: "Upload & submit your unit assignments, track due dates, and check faculty grades & feedback",
      icon: "📤",
      badge: "Assignments",
      action: "assignments",
    },
    {
      id: "std_study_materials",
      title: language === "English" ? "📂 Reference Materials & Manuals" : "📂 குறிப்புப் பொருட்கள்",
      description: "Download official Anna University syllabus copies, lab manuals, timetable, and previous question papers",
      icon: "📂",
      badge: "Lab & Syllabus",
      action: "materials",
    },
  ];

  const facultyCategories = [
    {
      id: "fac_create_upload",
      title: language === "English" ? "✍️ Create Notes & Upload Files" : "✍️ குறிப்புகள் எழுதுதல் & கோப்புகள் பதிவேற்றம்",
      description: "Draft unit notes, derivations & upload PDFs, circuit photos, diagrams, and files",
      icon: "✍️",
      badge: "Write & Upload",
      action: "create_upload",
    },
    {
      id: "fac_assignments",
      title: language === "English" ? "📝 Manage & Grade Assignments" : "📝 ஒப்படைப்புகளை நிர்வகிக்கவும்",
      description: "Create unit homework tasks, set due dates, evaluate student PDF uploads, and award marks",
      icon: "📝",
      badge: "Assignments",
      action: "assignments",
    },
  ];

  const categories = isFaculty ? facultyCategories : studentCategories;

  const filteredSubjects = availableSubjects.filter(
    (subject) =>
      subject.name.toLowerCase().includes(search.toLowerCase()) ||
      subject.tamil.toLowerCase().includes(search.toLowerCase()) ||
      (subject.assignedTeacher && subject.assignedTeacher.toLowerCase().includes(search.toLowerCase()))
  );

  const getFacultyDisplayName = () => {
    if (!currentUser) return "";
    if (currentUser.role === "faculty") {
      const assignedSub = facultyAssignedSubjects[0];
      if (assignedSub && assignedSub.assignedTeacher && assignedSub.assignedTeacher !== "Unassigned") {
        return assignedSub.assignedTeacher;
      }
      if (currentUser.name && currentUser.name.toLowerCase() !== currentUser.identifier?.toLowerCase()) {
        return currentUser.name;
      }
      return assignedSub?.assignedTeacher || "Faculty Teacher";
    }
    return currentUser.name || currentUser.identifier;
  };

  return (
    <div className="dashboard">
      {/* NAVBAR */}
      <header className="dashboard-navbar">
        <div className="dashboard-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          📚
          <span>StudyNotes</span>
        </div>

        <nav className="dashboard-nav">
          <a href="#home">Home</a>
          <a href="#subjects">Subjects</a>
          {currentUser && <a href="#notes">Categories</a>}
          {currentUser && <a href="#materials">Recent Notes</a>}
        </nav>

        <div className="dashboard-actions">
          <button
            className="language-btn"
            onClick={() => setLanguage(language === "English" ? "தமிழ்" : "English")}
            title="Toggle Language"
          >
            🌐 {language}
          </button>

          {currentUser ? (
            <div className="user-profile-bar">
              <span className={`role-badge ${currentUser.role}`}>
                {currentUser.role === "admin"
                  ? "🛡️ Admin"
                  : currentUser.role === "faculty"
                    ? "👨‍🏫 Faculty"
                    : "🎓 Student"}
                : <strong>{getFacultyDisplayName()}</strong>
              </span>
              <button className="logout-btn" onClick={logout}>
                Logout 🚪
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => navigate("/login")}>
              🔐 Sign In / Register
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section" id="home">
        <div className="hero-cursor-grid">
          <CursorGrid
            cellSize={65}
            color="#8B5CF6"
            radius={150}
            falloff="smooth"
            holdTime={400}
            fadeDuration={800}
            lineWidth={1.2}
            maxOpacity={0.85}
            fillOpacity={0.12}
            gridOpacity={0.06}
            cellRadius={8}
            clickPulse={true}
            pulseSpeed={600}
          />
        </div>

        <div className="hero-content">
          <span className="hero-badge">
            {isFaculty ? "👨‍🏫 Faculty Portal & Course Hub" : "🎓 Smart ECE & Engineering Hub"}
          </span>

          <h1>
            {isFaculty ? (
              <>
                Teach Smarter.
                <br />
                <span>Inspire Better.</span>
              </>
            ) : (
              <>
                Learn Smarter.
                <br />
                <span>Study Better.</span>
              </>
            )}
          </h1>

          <p>
            {isFaculty
              ? "Welcome to your Faculty Portal. Manage course study notes, 2-mark & 16-mark question banks, and lab manuals for your assigned subject."
              : "Welcome to StudyNotes — your complete academic companion for ECE notes, 2-mark & 16-mark solved questions, lab manuals, and exam preparation."}
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={() => document.getElementById("subjects")?.scrollIntoView({ behavior: "smooth" })}
            >
              {isFaculty ? "📚 Manage Course Notes" : "📚 Explore Subjects"}
            </button>

            {!currentUser ? (
              <button className="secondary-btn" onClick={() => navigate("/login")}>
                🔐 Create Account / Sign In
              </button>
            ) : (
              <button
                className="secondary-btn"
                onClick={() => document.getElementById("subjects")?.scrollIntoView({ behavior: "smooth" })}
              >
                {isFaculty
                  ? `⚡ View Assigned Subject (${availableSubjects.length})`
                  : `⚡ View Subjects (${availableSubjects.length})`}
              </button>
            )}
          </div>
        </div>

        <div className="hero-visual">
          <div className="study-card card-one">
            📖 <span>{isFaculty ? "Lecture Notes" : "PDF Notes"}</span>
          </div>

          <div className="study-card card-two">
            ⭐ <span>{isFaculty ? "Question Bank" : "Important Qs"}</span>
          </div>

          <div className="study-card card-three">
            🎯 <span>{isFaculty ? "Course Ready" : "Exams Ready"}</span>
          </div>

          <div className="hero-book">📚</div>
        </div>
      </section>

      {/* SEARCH SECTION */}
      <section className="search-section">
        <div className="search-box">
          <span>🔎</span>
          <input
            type="text"
            placeholder={
              isFaculty
                ? "Search notes, topics, or units in your course..."
                : "Search subjects, assigned teachers, or units..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} type="button">
              ✕
            </button>
          )}
        </div>
      </section>

      {/* CATEGORIES / FACULTY WORKSPACE SECTION */}
      {currentUser && (
        <section className="categories-section" id="notes">
          <div className="section-heading">
            <span>{isFaculty ? "FACULTY WORKSPACE & ACTIONS" : "EXPLORE RESOURCES"}</span>
            <h2>{isFaculty ? "Course Tools & Content Suite" : "Everything You Need To Excel"}</h2>
            <p>
              {isFaculty
                ? "Read course notes, write unit materials, and upload PDFs, circuit photos, and lab manuals for your assigned course."
                : "Access notes, question banks, and reference guides in one place."}
            </p>
          </div>

          <div className="category-grid">
            {categories.map((category, index) => (
              <div
                className="category-card"
                key={category.id || index}
                onClick={() => {
                  const targetSub = (isFaculty ? facultyAssignedSubjects[0] : null) || availableSubjects[0] || subjects[0];
                  if (category.action === "read" || category.action === "read_notes") {
                    if (targetSub) handleOpenSubject(targetSub, "all");
                  } else if (category.action === "assignments") {
                    if (targetSub) handleOpenSubject(targetSub, "assignments");
                  } else if (category.action === "qbank") {
                    if (targetSub) handleOpenSubject(targetSub, "qbank");
                  } else if (category.action === "pdf_docs") {
                    if (targetSub) handleOpenSubject(targetSub, "pdf_docs");
                  } else if (category.action === "create_upload" || category.action === "write" || category.action === "upload") {
                    setShowWriteNoteModal(true);
                  } else if (category.action === "materials") {
                    const qkSection = document.getElementById("quick-links") || document.getElementById("materials");
                    if (qkSection) qkSection.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                  <div className="category-icon">{category.icon}</div>
                  {category.badge && (
                    <span
                      style={{
                        background: "rgba(139, 92, 246, 0.15)",
                        color: "#c084fc",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: "20px",
                      }}
                    >
                      {category.badge}
                    </span>
                  )}
                </div>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
                <button type="button">
                  {category.action === "read" || category.action === "read_notes"
                    ? "Read Notes →"
                    : category.action === "create_upload"
                    ? "Create & Upload →"
                    : category.action === "assignments"
                    ? (isFaculty ? "Manage Tasks →" : "Submit Work →")
                    : category.action === "qbank"
                    ? "View Q&As →"
                    : category.action === "pdf_docs"
                    ? "View PDFs →"
                    : "Explore →"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ECE CURRICULUM & SUBJECTS SECTION */}
      <section className="subjects-section" id="subjects">
        <div className="section-heading-with-action">
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <span>📚 ECE CURRICULUM & SUBJECTS</span>
            <h2>{isFaculty ? "Your Assigned Subjects" : "ECE Department Subjects"}</h2>
            <p>
              {isFaculty
                ? "Access and manage study notes, question banks, and course materials for your assigned subjects."
                : "Explore unit study notes, question banks, lab manuals, and assignments for your enrolled subjects."}
            </p>
          </div>

          {/* ADMIN ADD SUBJECT BUTTON */}
          {isAdmin && (
            <button className="admin-add-sub-btn" onClick={() => setShowAddSubjectModal(true)}>
              ➕ Add New Subject
            </button>
          )}
        </div>

        {/* VIEW MODE TOGGLE BAR FOR SMART EXPANDED PREVIEW MODE */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "24px 0 20px 0",
          background: "rgba(17, 24, 39, 0.7)",
          padding: "12px 18px",
          borderRadius: "16px",
          border: "1px solid rgba(168, 85, 247, 0.3)",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c084fc" }}>Display Layout:</span>
            <button
              type="button"
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                background: subjectViewMode === "grid" ? "linear-gradient(135deg, var(--accent-purple), #7c3aed)" : "rgba(255,255,255,0.05)",
                color: "#ffffff",
                borderColor: subjectViewMode === "grid" ? "#a855f7" : "rgba(255,255,255,0.1)",
                boxShadow: subjectViewMode === "grid" ? "0 4px 12px rgba(139, 92, 246, 0.3)" : "none"
              }}
              onClick={() => setSubjectViewMode("grid")}
            >
              📱 Standard Grid
            </button>
            <button
              type="button"
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

          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            {subjectViewMode === "expanded" ? "✨ Expanded view with unit topics & interactive preview action buttons" : "💡 Switch to Expanded Preview for full unit lists & audio reader"}
          </span>
        </div>

        <div className={subjectViewMode === "expanded" ? "subjects-expanded-list" : "subjects-grid"}>
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((subject) => {
              const assignCount = getSubjectAssignmentCount(subject.id, subject.name);
              const pubCount = getSubjectPublishedCount(subject.id, subject.name);

              if (subjectViewMode === "expanded") {
                const units = subject.units || ["Unit 1: Fundamentals & Theory", "Unit 2: Standard Formulations", "Unit 3: Derivations & Problems"];

                return (
                  <div
                    key={subject.id}
                    className="subject-card expanded-mode"
                    style={{
                      gridColumn: "1 / -1",
                      background: "rgba(17, 24, 39, 0.95)",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      borderRadius: "20px",
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      boxShadow: "0 12px 35px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ fontSize: "2.8rem", padding: "12px", background: "rgba(255,255,255,0.06)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.12)" }}>
                          {subject.icon}
                        </div>
                        <div>
                          <h3 style={{ fontSize: "1.45rem", margin: "0 0 6px 0", color: "#ffffff", fontFamily: "var(--font-heading)" }}>
                            {language === "English" ? subject.name : subject.tamil}
                          </h3>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.82rem", background: "rgba(168,85,247,0.18)", color: "#c084fc", padding: "3px 12px", borderRadius: "14px", border: "1px solid rgba(168,85,247,0.35)", fontWeight: 700 }}>
                              📚 {pubCount} Note{pubCount === 1 ? "" : "s"}
                            </span>
                            <span style={{ fontSize: "0.82rem", background: "rgba(6,182,212,0.18)", color: "#38bdf8", padding: "3px 12px", borderRadius: "14px", border: "1px solid rgba(6,182,212,0.35)", fontWeight: 700 }}>
                              📝 {assignCount} Assignment{assignCount === 1 ? "" : "s"}
                            </span>
                            {subject.assignedTeacher && (
                              <span style={{ fontSize: "0.85rem", color: "#34d399", fontWeight: 600 }}>
                                👨‍🏫 Faculty: {subject.assignedTeacher}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          style={{
                            padding: "10px 18px",
                            borderRadius: "12px",
                            border: "1px solid #a855f7",
                            background: "linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(124, 58, 237, 0.4))",
                            color: "#ffffff",
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: "0 4px 15px rgba(168,85,247,0.35)"
                          }}
                          onClick={() => setSmartPreviewItem(subject)}
                        >
                          ⚡ Smart Expanded Preview Mode
                        </button>

                        <button
                          type="button"
                          style={{
                            padding: "10px 18px",
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "rgba(255,255,255,0.06)",
                            color: "#ffffff",
                            fontSize: "0.88rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          onClick={() => handleOpenSubject(subject, "all")}
                        >
                          📖 View Full Explorer →
                        </button>
                      </div>
                    </div>

                    {/* UNIT TOPICS QUICK PREVIEW LIST */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px", marginTop: "4px" }}>
                      <span style={{ fontSize: "0.88rem", color: "#c084fc", fontWeight: 700, display: "block", marginBottom: "10px" }}>
                        🎯 Course Units & Interactive Previews:
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                        {units.map((u, i) => (
                          <div
                            key={i}
                            style={{
                              padding: "10px 14px",
                              background: "rgba(255, 255, 255, 0.03)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              borderRadius: "12px",
                              fontSize: "0.88rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ color: "#e2e8f0" }}>📄 {u}</span>
                            <button
                              type="button"
                              style={{
                                background: "rgba(168,85,247,0.2)",
                                border: "1px solid rgba(168,85,247,0.4)",
                                color: "#e9d5ff",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "4px 10px",
                                borderRadius: "8px",
                                cursor: "pointer",
                              }}
                              onClick={() => setSmartPreviewItem({ title: u, unit: `Unit ${i+1}`, name: subject.name, icon: subject.icon, units: subject.units })}
                            >
                              Preview
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  className="subject-card"
                  key={subject.id}
                  onClick={() => handleOpenSubject(subject, "all")}
                >
                  <div className="subject-top-row">
                    <div className="subject-icon">{subject.icon}</div>

                    {/* ADMIN EDIT & DELETE BUTTONS */}
                    {isAdmin && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="delete-subject-btn"
                          onClick={(e) => handleOpenEditSubject(subject, e)}
                          title="Edit Subject & Faculty (Admin)"
                          style={{ background: "rgba(139, 92, 246, 0.2)", color: "#c084fc", border: "1px solid rgba(139, 92, 246, 0.4)" }}
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-subject-btn"
                          onClick={(e) => handleDeleteSubject(subject.id, subject.name, e)}
                          title="Remove Subject (Admin)"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
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

                    {/* ASSIGNED TEACHER DISPLAY */}
                    {currentUser && (
                      <div className="teacher-assignment-container" onClick={(e) => e.stopPropagation()}>
                        <span className="teacher-label">👨‍🏫 Faculty:</span>
                        <span className="teacher-badge-text">
                          {subject.assignedTeacher || "Unassigned"}
                        </span>
                      </div>
                    )}

                    {/* SUBJECT VIEW ACTION BUTTONS */}
                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(168, 85, 247, 0.4)",
                          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(124, 58, 237, 0.25))",
                          color: "#e9d5ff",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.2s ease",
                        }}
                        onClick={() => setSmartPreviewItem(subject)}
                      >
                        ⚡ Smart Expanded Preview
                      </button>

                      <button
                        type="button"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(139, 92, 246, 0.4)",
                          background: "rgba(139, 92, 246, 0.15)",
                          color: "#c084fc",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.2s ease",
                        }}
                        onClick={() => handleOpenSubject(subject, "all")}
                      >
                        📖 View Notes & Resources →
                      </button>
                    </div>
                  </div>

                  <button type="button" className="subject-arrow-btn" aria-label="Open subject detail">
                    →
                  </button>
                </div>
              );
            })
          ) : (
            <div className="no-results">
              <span>🔍</span>
              <h3>No subjects match "{search}"</h3>
              <p>Try searching for terms like Physics, Python, Wireless, or Faculty Name.</p>
            </div>
          )}
        </div>
      </section>

      {/* RECENTLY VIEWED / FACULTY ASSIGNED NOTES SECTION */}
      {currentUser && (
        <section className="recent-section" id="materials">
          <div className="section-heading">
            <span>{isFaculty ? "FACULTY SUBJECT NOTES" : "RECENTLY VIEWED"}</span>
            <h2>{isFaculty ? "Your Assigned Subject Notes" : "Your Recently Viewed Notes"}</h2>
            <p>
              {isFaculty
                ? "Study materials and question banks for your assigned course."
                : "Quick access to study materials from subjects you recently explored."}
            </p>
          </div>

          {displayRecentNotes.length > 0 ? (
            <div className="recent-grid">
              {displayRecentNotes.map((note) => (
                <div
                  className="recent-card"
                  key={note.id}
                  onClick={() => handleOpenSubject(note.subjectObj)}
                >
                  <div className="recent-top">
                    <div className="recent-icon">{note.icon}</div>
                    <span className="note-type">{note.type}</span>
                  </div>
                  <h3>{note.title}</h3>
                  <p>{note.subject}</p>
                  <div className="note-footer">
                    <span>{note.unit}</span>
                    <button type="button">Explore Notes →</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "40px 24px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px dashed rgba(139, 92, 246, 0.3)",
                borderRadius: "20px",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              <span style={{ fontSize: "2.8rem", display: "block", marginBottom: "12px" }}>
                {!currentUser ? "🔒" : "📖"}
              </span>
              <h3 style={{ fontSize: "1.3rem", color: "#ffffff", marginBottom: "8px", fontFamily: "var(--font-heading)" }}>
                {!currentUser
                  ? "Faculty Notes Protected"
                  : isFaculty
                  ? "No Published Notes Found"
                  : "No Published Notes Available Yet"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "20px", lineHeight: 1.5 }}>
                {!currentUser
                  ? "Please sign in to access faculty-given study notes, 2-mark & 16-mark question banks, and course files. Only the website dashboard curriculum is visible when logged out."
                  : isFaculty
                  ? "You haven't published any notes for your assigned subject yet. Click 'Create Notes & Upload Files' above to publish your first note!"
                  : "No study notes have been published by faculty yet. Touch any subject card above or check back later!"}
              </p>
              {!currentUser ? (
                <button
                  className="primary-btn"
                  onClick={() => navigate("/login")}
                >
                  🔐 Sign In / Register to Access Notes
                </button>
              ) : !isFaculty && (
                <button
                  className="primary-btn"
                  onClick={() => document.getElementById("subjects")?.scrollIntoView({ behavior: "smooth" })}
                >
                  ⚡ Explore Subjects Now
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* EXAM / FACULTY RESOURCE BANNER */}
      <section className="exam-section">
        <div className="exam-content">
          <span className="hero-badge">
            {isFaculty ? "👨‍🏫 Faculty Teaching & Resource Hub" : "🎯 Anna University & Semester Exams"}
          </span>
          <h2>
            {isFaculty ? "Empower Your Students with Quality Content" : "Prepare with Confidence"}
          </h2>
          <p>
            {isFaculty
              ? "Upload unit-wise lecture notes, curate 2-mark & 16-mark question banks, assign homework, and evaluate student submissions for your assigned course."
              : "Revise key 2-mark definitions, 13-mark derivations, and 16-mark design problems with step-by-step solutions."}
          </p>
          {isFaculty ? (
            <button
              className="primary-btn"
              onClick={() => {
                const writeBtn = document.querySelector('.category-card[title="Create Notes & Upload Files"]') || document.getElementById("subjects");
                if (writeBtn) writeBtn.scrollIntoView({ behavior: "smooth" });
                setShowWriteNoteModal(true);
              }}
            >
              ✍️ Publish Study Material & Notes →
            </button>
          ) : !currentUser ? (
            <button className="primary-btn" onClick={() => navigate("/login")}>
              Create Account / Sign In →
            </button>
          ) : (
            <button
              className="primary-btn"
              onClick={() => document.getElementById("subjects")?.scrollIntoView({ behavior: "smooth" })}
            >
              Start Learning Now →
            </button>
          )}
        </div>

        <div className="exam-visual">
          {isFaculty ? "👨‍🏫" : "📝"} <div>{isFaculty ? "📚" : "⭐"}</div> <div>{isFaculty ? "📝" : "🎯"}</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <div className="footer-brand">
          <h3>📚 StudyNotes</h3>
          <p>Smart learning hub for Electronics & Communication Engineering students.</p>
        </div>

        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#subjects">Subjects</a>
          <a href="#notes">Categories</a>
          {!currentUser ? (
            <button onClick={() => navigate("/login")}>Sign In / Register</button>
          ) : (
            <button onClick={logout}>Logout</button>
          )}
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} StudyNotes Hub. All rights reserved.
        </div>
      </footer>

      {/* SUBJECT NOTES EXPLORER & CUSTOM PDF DOWNLOADER MODAL */}
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

      {/* INTERACTIVE NOTE / SUBJECT DETAILS MODAL */}
      {activeModal && (
        <div className="note-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="note-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <span style={{ fontSize: "2.5rem" }}>{activeModal.icon}</span>
              <div>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", margin: 0 }}>
                  {activeModal.title}
                </h2>
                {activeModal.subject && (
                  <span style={{ color: "var(--accent-purple-light)", fontSize: "0.9rem", fontWeight: 600 }}>
                    {activeModal.subject} • {activeModal.unit}
                  </span>
                )}
                {activeModal.assignedTeacher && (
                  <div style={{ color: "var(--accent-cyan)", fontSize: "0.85rem", marginTop: "4px" }}>
                    👨‍🏫 Faculty: <strong>{activeModal.assignedTeacher}</strong>
                  </div>
                )}
              </div>
            </div>

            {activeModal.description && (
              <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "1rem" }}>
                {activeModal.description}
              </p>
            )}

            {activeModal.units && (
              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ marginBottom: "10px", color: "var(--text-primary)" }}>Included Units:</h4>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {activeModal.units.map((u, i) => (
                    <li
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "0.9rem",
                      }}
                    >
                      📄 {u}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                className="primary-btn"
                style={{ flex: 1, padding: "12px" }}
                onClick={() => {
                  setActiveModal(null);
                  if (!currentUser) navigate("/login");
                  else alert("Downloading PDF study notes...");
                }}
              >
                📥 Download Full PDF Notes
              </button>
              <button
                className="secondary-btn"
                style={{ padding: "12px 20px" }}
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN ADD SUBJECT MODAL */}
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
                    placeholder="e.g. engineering physics"
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
                    placeholder="e.g. பொறியியல் இயற்பியல்"
                    value={newSubTamil}
                    onChange={(e) => setNewSubTamil(e.target.value)}
                  />
                </div>
              </div>

              {/* ASSIGN FACULTY TEACHER TEXT BOX */}
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
                    placeholder="e.g. engineering physics"
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
                    placeholder="e.g. பொறியியல் இயற்பியல்"
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
                    placeholder="e.g. Dr. Sundaram / Prof. Priya"
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
      {/* FACULTY COMBINED CREATE NOTES & UPLOAD FILES MODAL */}
      {showWriteNoteModal && (
        <div className="note-modal-backdrop" onClick={() => setShowWriteNoteModal(false)}>
          <div className="note-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px", maxHeight: "90vh", overflowY: "auto" }}>
            <button className="modal-close-btn" onClick={() => setShowWriteNoteModal(false)}>
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <span style={{ fontSize: "2.2rem" }}>✍️📤</span>
              <div>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", margin: 0 }}>
                  Create Notes & Upload Course Files
                </h2>
                <span style={{ color: "var(--accent-purple-light)", fontSize: "0.85rem" }}>
                  Write lecture notes or upload reference files, circuit photos, and PDFs for your course
                </span>
              </div>
            </div>

            <form onSubmit={handleWriteNoteSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Select Subject</label>
                  <select
                    className="form-control"
                    value={writeSubId || (facultyAssignedSubjects[0]?.id || availableSubjects[0]?.id || "")}
                    onChange={(e) => setWriteSubId(e.target.value)}
                    style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-subtle)", width: "100%" }}
                  >
                    {availableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code || "Course"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Unit / Chapter</label>
                  <input
                    type="text"
                    placeholder="e.g. Unit 1 / Chapter 2"
                    value={writeUnit}
                    onChange={(e) => setWriteUnit(e.target.value)}
                    style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-subtle)", width: "100%" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Note Format / Type</label>
                <select
                  className="form-control"
                  value={writeNoteType}
                  onChange={(e) => setWriteNoteType(e.target.value)}
                  style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-subtle)", width: "100%" }}
                >
                  <option value="Lecture Notes">📖 Lecture Notes</option>
                  <option value="2-Mark Q&A">✏️ 2-Mark Short Q&A</option>
                  <option value="13-Mark Derivation">📚 13-Mark Step Derivation</option>
                  <option value="16-Mark Problem">🎯 16-Mark Comprehensive Problem</option>
                  <option value="Photo / Circuit Diagram">🖼️ Photo / Circuit Diagram</option>
                  <option value="PDF Document">📄 PDF Document</option>
                </select>
              </div>

              <div className="form-group">
                <label>Section Heading / Topic Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 1. Core Mathematical Formulation & Derivation (Optional)"
                  value={writeSection1Heading}
                  onChange={(e) => setWriteSection1Heading(e.target.value)}
                  style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-subtle)", width: "100%" }}
                />
              </div>

              <div className="form-group">
                <label>Full Note Content / Derivation Steps / Explanation (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Write full explanation, formulas, step-by-step solutions, key points (Optional)..."
                  value={writeSection1Body}
                  onChange={(e) => setWriteSection1Body(e.target.value)}
                  style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-subtle)", width: "100%", resize: "vertical" }}
                />
              </div>

              {/* ATTACH FILE, PDF & PHOTOS SECTION EMBEDDED DIRECTLY IN FORM */}
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📤 Attach File, PDF or Photo (Optional)</span>
                </label>
                <div
                  style={{
                    border: "2px dashed rgba(139, 92, 246, 0.4)",
                    borderRadius: "14px",
                    padding: "16px",
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.02)",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,image/*,.doc,.docx,.ppt,.pptx"
                    onChange={handleFileChange}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer",
                    }}
                  />
                  {uploadFileObj ? (
                    <div>
                      {uploadFilePreview ? (
                        <div style={{ marginBottom: "8px" }}>
                          <img
                            src={uploadFilePreview}
                            alt="Preview"
                            style={{ maxHeight: "100px", borderRadius: "8px", objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: "2rem", display: "block", marginBottom: "4px" }}>📄</span>
                      )}
                      <div style={{ fontWeight: 600, color: "var(--accent-cyan)", fontSize: "0.9rem" }}>
                        {uploadFileObj.name}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {(uploadFileObj.size / (1024 * 1024)).toFixed(2)} MB • Ready to attach
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "4px" }}>📁</span>
                      <div style={{ fontSize: "0.9rem", color: "#fff", fontWeight: 600 }}>
                        Click to browse or attach PDF, Photo / Diagram, or File
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                        Supports PDF, PNG, JPG, DOCX, PPTX (Max 25MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button type="submit" className="primary-btn" style={{ flex: 1, padding: "12px" }}>
                  🚀 Publish Note & Resource
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowWriteNoteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SMART EXPANDED PREVIEW MODAL */}
      {smartPreviewItem && (
        <SmartExpandedPreviewModal
          item={smartPreviewItem}
          subject={smartPreviewItem.units ? smartPreviewItem : null}
          currentUser={currentUser}
          onClose={() => setSmartPreviewItem(null)}
          onDownload={(itemToDl) => handleOpenSubject(smartPreviewItem, "all")}
        />
      )}
    </div>
  );
}

export default Dashboard;