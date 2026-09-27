import { useState, useEffect } from "react";
import { generateNotesPDF } from "../utils/pdfGenerator";
import SmartExpandedPreviewModal from "./SmartExpandedPreviewModal";
import { 
  subscribeNotes, 
  subscribeAssignments, 
  subscribeSubmissions,
  createAssignmentInFirestore,
  deleteAssignmentFromFirestore,
  submitStudentAssignmentToFirestore,
  gradeStudentSubmissionInFirestore,
  deleteNoteFromFirestore,
  deleteFileFromFirestore
} from "../services/firestoreService";
import "./SubjectNotesModal.css";

/**
 * SubjectNotesModal component displays faculty-published study notes, uploaded files,
 * and the complete Assignment & Student Submission Portal.
 */
const isUnitMatch = (u1, u2) => {
  if (!u1 || !u2) return false;
  if (u1.toLowerCase().trim() === u2.toLowerCase().trim()) return true;

  const extractUnitNum = (str) => {
    const match = str.match(/unit\s*(\d+)/i);
    return match ? `unit_${match[1]}` : str.toLowerCase().trim();
  };

  return extractUnitNum(u1) === extractUnitNum(u2);
};

const isQuestionBankNote = (note) => {
  if (!note) return false;
  const t = (note.type || note.fileType || "").toLowerCase();
  return (
    t.includes("2-mark") ||
    t.includes("13-mark") ||
    t.includes("16-mark") ||
    t.includes("q&a") ||
    t.includes("question") ||
    t.includes("derivation") ||
    t.includes("problem")
  );
};

const isPDFDocument = (item) => {
  if (!item) return false;
  const noteType = (item.type || item.fileType || "").trim();
  return noteType === "PDF Document";
};

export default function SubjectNotesModal({
  subject,
  onClose,
  currentUser,
  navigate,
  initialMode = "all",
  onUpdateNotes,
  onUpdateFiles,
}) {
  const [viewMode, setViewMode] = useState(initialMode);
  const [smartPreviewItem, setSmartPreviewItem] = useState(null);
  const isFacultyOrAdmin = currentUser?.role === "faculty" || currentUser?.role === "admin";

  // Persistent state initialized from localStorage
  const [customNotesState, setCustomNotesState] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_notes");
      const list = saved ? JSON.parse(saved) : [];
      return list;
    } catch (e) {
      console.error("Failed to load custom notes in modal", e);
      return [];
    }
  });

  const [customFilesState, setCustomFilesState] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_files");
      const list = saved ? JSON.parse(saved) : [];
      return list;
    } catch (e) {
      console.error("Failed to load custom files in modal", e);
      return [];
    }
  });

  // Persistent Assignments state
  const [customAssignmentsState, setCustomAssignmentsState] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_assignments");
      const list = saved ? JSON.parse(saved) : [];
      return list;
    } catch (e) {
      console.error("Failed to load custom assignments in modal", e);
      return [];
    }
  });

  // Persistent Student Submissions state
  const [customSubmissionsState, setCustomSubmissionsState] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_submissions");
      const list = saved ? JSON.parse(saved) : [];
      return list;
    } catch (e) {
      console.error("Failed to load custom submissions in modal", e);
      return [];
    }
  });

  // Subscribe to real-time Firestore assignments & submissions
  useEffect(() => {
    if (!subject?.id) return;
    const unsubAssigns = subscribeAssignments(subject.id, (fsAssigns) => {
      if (fsAssigns && fsAssigns.length > 0) {
        setCustomAssignmentsState((prev) => {
          const mergedMap = new Map();
          prev.forEach((a) => mergedMap.set(a.id, a));
          fsAssigns.forEach((a) => mergedMap.set(a.id, a));
          return Array.from(mergedMap.values());
        });
      }
    });

    const unsubSubs = subscribeSubmissions(subject.id, (fsSubs) => {
      if (fsSubs && fsSubs.length > 0) {
        setCustomSubmissionsState((prev) => {
          const mergedMap = new Map();
          prev.forEach((s) => mergedMap.set(s.id, s));
          fsSubs.forEach((s) => mergedMap.set(s.id, s));
          return Array.from(mergedMap.values());
        });
      }
    });

    return () => {
      if (unsubAssigns) unsubAssigns();
      if (unsubSubs) unsubSubs();
    };
  }, [subject?.id]);

  // Edit modal states
  const [editingNote, setEditingNote] = useState(null);
  const [editingFile, setEditingFile] = useState(null);

  // Assignment creation modal state (Faculty)
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignUnit, setAssignUnit] = useState("Unit 1");
  const [assignDueDate, setAssignDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [assignMaxMarks, setAssignMaxMarks] = useState("20");
  const [assignDesc, setAssignDesc] = useState("");

  // Student upload submission state
  const [submittingAssignId, setSubmittingAssignId] = useState(null);
  const [studentFileObj, setStudentFileObj] = useState(null);
  const [studentRemarks, setStudentRemarks] = useState("");
  const [directSubmitUnit, setDirectSubmitUnit] = useState("Unit 1");
  const [showDirectUploadBox, setShowDirectUploadBox] = useState(false);

  // Faculty evaluation drawer state
  const [evaluatingAssignId, setEvaluatingAssignId] = useState(null);
  const [gradingScores, setGradingScores] = useState({});

  // Filter raw notes & files for the active subject
  // Filter raw notes & files for the active subject (Protected when logged out)
  const rawCustomNotes = !currentUser
    ? []
    : customNotesState.filter(
        (n) =>
          n.id &&
          n.id.startsWith("custom_note_") &&
          (n.subjectId === subject.id || n.subjectName?.toLowerCase() === subject.name.toLowerCase())
      );

  const rawCustomFiles = !currentUser
    ? []
    : customFilesState.filter(
        (f) =>
          f.id &&
          f.id.startsWith("custom_file_") &&
          (f.subjectId === subject.id || f.subjectName?.toLowerCase() === subject.name.toLowerCase())
      );

  const subjectAssignments = !currentUser
    ? []
    : customAssignmentsState.filter(
        (a) =>
          a.subjectId === subject.id ||
          a.subjectName?.toLowerCase() === subject.name.toLowerCase()
      );

  // Filter notes & files by active view mode (All, Question Bank, PDF Documents)
  const customNotes =
    viewMode === "qbank"
      ? rawCustomNotes.filter(isQuestionBankNote)
      : viewMode === "pdf_docs"
      ? rawCustomNotes.filter(isPDFDocument)
      : rawCustomNotes;

  const customFiles =
    viewMode === "qbank"
      ? rawCustomFiles.filter(isQuestionBankNote)
      : viewMode === "pdf_docs"
      ? rawCustomFiles.filter(isPDFDocument)
      : rawCustomFiles;

  const allNotes = customNotes;

  // Extract unique units for tab filters strictly from published notes and uploaded files
  const customNoteUnits = allNotes.map((n) => n.unit).filter(Boolean);
  const customFileUnits = customFiles.map((f) => f.unit).filter(Boolean);

  const unitList = [...new Set([...customNoteUnits, ...customFileUnits])];

  const categories =
    customFiles.length > 0
      ? unitList.length > 0
        ? [...unitList, "Uploaded Files", "All"]
        : ["Uploaded Files"]
      : unitList.length > 0
      ? [...unitList, "All"]
      : [];

  // States for category tabs and checkboxes
  const [activeCategory, setActiveCategory] = useState(
    unitList.length > 0 ? unitList[0] : customFiles.length > 0 ? "Uploaded Files" : "All"
  );
  const [selectedNoteIds, setSelectedNoteIds] = useState(
    new Set(allNotes.map((n) => n.id))
  );

  // Filter notes and files based on active tab
  const filteredNotes =
    activeCategory === "All"
      ? allNotes
      : activeCategory === "Uploaded Files"
      ? []
      : allNotes.filter((n) => isUnitMatch(n.unit, activeCategory));

  const filteredFiles =
    activeCategory === "All" || activeCategory === "Uploaded Files"
      ? customFiles
      : customFiles.filter((f) => isUnitMatch(f.unit, activeCategory));

  const [expandedNoteIds, setExpandedNoteIds] = useState(
    new Set(filteredNotes[0]?.id ? [filteredNotes[0].id] : [])
  );

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    const visibleNotes = cat === "All" ? allNotes : allNotes.filter((n) => isUnitMatch(n.unit, cat));
    setExpandedNoteIds(new Set(visibleNotes[0]?.id ? [visibleNotes[0].id] : []));
  };

  // Checkbox handlers
  const toggleSelectNote = (id) => {
    const next = new Set(selectedNoteIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedNoteIds(next);
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredNotes.map((n) => n.id);
    const allVisibleSelected = visibleIds.every((id) => selectedNoteIds.has(id));

    const next = new Set(selectedNoteIds);
    if (allVisibleSelected) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }
    setSelectedNoteIds(next);
  };

  // Reader toggle
  const toggleReadNote = (id) => {
    const next = new Set(expandedNoteIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedNoteIds(next);
  };

  // Delete Handlers
  const handleDeleteNote = (noteId) => {
    if (window.confirm("Are you sure you want to delete this study note?")) {
      const updatedMaster = customNotesState.filter((n) => n.id !== noteId);
      localStorage.setItem("studynotes_custom_notes", JSON.stringify(updatedMaster));
      setCustomNotesState(updatedMaster);
      if (onUpdateNotes) onUpdateNotes(updatedMaster);
    }
  };

  const handleDeleteFile = (fileId) => {
    if (window.confirm("Are you sure you want to delete this uploaded file?")) {
      const updatedMaster = customFilesState.filter((f) => f.id !== fileId);
      localStorage.setItem("studynotes_custom_files", JSON.stringify(updatedMaster));
      setCustomFilesState(updatedMaster);
      if (onUpdateFiles) onUpdateFiles(updatedMaster);
    }
  };

  // Edit Handlers
  const handleSaveEditNote = (e) => {
    e.preventDefault();
    if (!editingNote) return;

    const updatedMaster = customNotesState.map((n) => {
      if (n.id === editingNote.id) {
        const typeClass =
          editingNote.type.includes("2-Mark") ||
          editingNote.type.includes("Question") ||
          editingNote.type.includes("Derivation") ||
          editingNote.type.includes("Problem")
            ? "qbank"
            : editingNote.type.includes("PDF")
            ? "pdf"
            : "lecture";

        return {
          ...n,
          title: editingNote.title,
          type: editingNote.type,
          unit: editingNote.unit,
          description: editingNote.description,
          typeTagClass: typeClass,
          sections: [
            {
              heading: editingNote.heading,
              body: editingNote.body,
            },
          ],
        };
      }
      return n;
    });

    localStorage.setItem("studynotes_custom_notes", JSON.stringify(updatedMaster));
    setCustomNotesState(updatedMaster);
    if (onUpdateNotes) onUpdateNotes(updatedMaster);
    setEditingNote(null);
  };

  const handleSaveEditFile = (e) => {
    e.preventDefault();
    if (!editingFile) return;

    const updatedMaster = customFilesState.map((f) => {
      if (f.id === editingFile.id) {
        return {
          ...f,
          title: editingFile.title,
          fileType: editingFile.fileType,
          unit: editingFile.unit,
          description: editingFile.description,
        };
      }
      return f;
    });

    localStorage.setItem("studynotes_custom_files", JSON.stringify(updatedMaster));
    setCustomFilesState(updatedMaster);
    if (onUpdateFiles) onUpdateFiles(updatedMaster);
    setEditingFile(null);
  };

  // Assignment Handlers (Synced with Cloud Firestore & Storage)
  const handleCreateAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!assignTitle.trim()) return;

    const newAssignment = {
      id: `assignment_${Date.now()}`,
      subjectId: subject.id,
      subjectName: subject.name,
      unit: assignUnit,
      title: assignTitle.trim(),
      description: assignDesc.trim() || "Complete the assignment questions and upload your response as a PDF or document.",
      dueDate: assignDueDate,
      maxMarks: parseInt(assignMaxMarks) || 20,
      createdBy: currentUser?.name || subject.assignedTeacher || "Faculty",
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    try {
      await createAssignmentInFirestore(newAssignment);
    } catch (fsErr) {
      console.warn("Firestore save assignment warning:", fsErr.message);
    }

    const updated = [newAssignment, ...customAssignmentsState];
    localStorage.setItem("studynotes_custom_assignments", JSON.stringify(updated));
    setCustomAssignmentsState(updated);
    setShowCreateAssignmentModal(false);
    setAssignTitle("");
    setAssignDesc("");
  };

  const handleDeleteAssignment = async (assignId) => {
    if (window.confirm("Are you sure you want to delete this assignment task?")) {
      try {
        await deleteAssignmentFromFirestore(assignId);
      } catch (fsErr) {
        console.warn("Firestore delete assignment warning:", fsErr.message);
      }

      const updatedAssigns = customAssignmentsState.filter((a) => a.id !== assignId);
      localStorage.setItem("studynotes_custom_assignments", JSON.stringify(updatedAssigns));
      setCustomAssignmentsState(updatedAssigns);

      const updatedSubs = customSubmissionsState.filter((s) => s.assignmentId !== assignId);
      localStorage.setItem("studynotes_custom_submissions", JSON.stringify(updatedSubs));
      setCustomSubmissionsState(updatedSubs);
    }
  };

  const handleStudentSubmitAssignment = async (assignment, unitOverride) => {
    if (!studentFileObj) {
      alert("Please select a PDF or document file to submit.");
      return;
    }

    let fileDataUrl = null;
    try {
      fileDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(studentFileObj);
      });
    } catch (e) {
      console.warn("Could not read student file data:", e);
    }

    const assignId = assignment ? assignment.id : `assignment_custom_${unitOverride || directSubmitUnit}_${subject.id}`;
    const assignUnitVal = assignment ? assignment.unit : (unitOverride || directSubmitUnit);

    const newSubmission = {
      id: `submission_${Date.now()}`,
      assignmentId: assignId,
      subjectId: subject.id,
      unit: assignUnitVal,
      studentName: currentUser?.name || currentUser?.identifier || "Student User",
      studentIdentifier: currentUser?.identifier || "RegNo-2026-ECE",
      fileName: studentFileObj.name,
      fileSize: (studentFileObj.size / (1024 * 1024)).toFixed(2) + " MB",
      fileUrl: fileDataUrl,
      previewUrl: fileDataUrl,
      remarks: studentRemarks,
      submittedAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: "Submitted",
      marks: null,
      feedback: "",
    };

    try {
      await submitStudentAssignmentToFirestore(newSubmission, studentFileObj);
    } catch (fsErr) {
      console.warn("Firestore submission warning:", fsErr.message);
    }

    const filteredSubs = customSubmissionsState.filter(
      (s) => !(s.assignmentId === assignId && s.studentIdentifier === newSubmission.studentIdentifier)
    );
    const updated = [newSubmission, ...filteredSubs];
    localStorage.setItem("studynotes_custom_submissions", JSON.stringify(updated));
    setCustomSubmissionsState(updated);
    setSubmittingAssignId(null);
    setShowDirectUploadBox(false);
    setStudentFileObj(null);
    setStudentRemarks("");
    alert(`🎉 Success! Assignment for ${assignUnitVal} submitted successfully to faculty!`);
  };

  const handleSaveStudentGrade = async (subId, maxMarks) => {
    const gradeData = gradingScores[subId];
    if (!gradeData || gradeData.marks === undefined) {
      alert("Please enter marks to award.");
      return;
    }

    const marksNum = parseInt(gradeData.marks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
      alert(`Please enter valid marks between 0 and ${maxMarks}.`);
      return;
    }

    try {
      await gradeStudentSubmissionInFirestore(subId, {
        marks: marksNum,
        feedback: gradeData.feedback || "Good effort!",
      });
    } catch (fsErr) {
      console.warn("Firestore grade submission warning:", fsErr.message);
    }

    const updated = customSubmissionsState.map((s) => {
      if (s.id === subId) {
        return {
          ...s,
          marks: marksNum,
          feedback: gradeData.feedback || "Good effort!",
          status: "Graded",
        };
      }
      return s;
    });

    localStorage.setItem("studynotes_custom_submissions", JSON.stringify(updated));
    setCustomSubmissionsState(updated);
    alert("⭐ Student grade and feedback saved successfully!");
  };

  const handleDownloadResourceFile = (file) => {
    if (file.previewUrl) {
      const link = document.createElement("a");
      link.href = file.previewUrl;
      link.download = file.fileName || `${file.title || "Resource"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const fileText = `Subject: ${subject.name}\nResource Title: ${file.title || file.fileName}\nUnit: ${file.unit || "N/A"}\nFile Type: ${file.fileType || "Document"}\nUploaded Date: ${file.uploadedAt || "N/A"}\n\nDescription / Study Material:\n${file.description || "Course study document uploaded by faculty."}`;
      const blob = new Blob([fileText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName && file.fileName.includes(".") ? file.fileName : `${file.title || "Course_Resource"}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleViewResourceFile = (file) => {
    setSmartPreviewItem(file);
  };

  const handleDownloadSubmissionFile = (sub) => {
    const fileSrc = sub.fileUrl || sub.previewUrl;
    if (fileSrc) {
      const link = document.createElement("a");
      link.href = fileSrc;
      link.download = sub.fileName || `${sub.studentName}_Submission`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const subText = `Student Assignment Submission\n===============================\nStudent Name: ${sub.studentName}\nRegister Number: ${sub.studentIdentifier}\nUnit: ${sub.unit}\nSubmitted At: ${sub.submittedAt}\nFile Name: ${sub.fileName}\nRemarks: ${sub.remarks || "None"}\nStatus: ${sub.status}\nMarks Awarded: ${sub.marks !== null ? sub.marks : "Pending"}\nFaculty Feedback: ${sub.feedback || "None"}`;
      const blob = new Blob([subText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = sub.fileName && sub.fileName.includes(".") ? sub.fileName : `${sub.studentName}_Submission.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // PDF Generation triggers
  const handleDownloadSinglePDF = (note, e) => {
    e.stopPropagation();
    if (!currentUser) {
      if (window.confirm("Please sign in or register to download PDF study notes.")) {
        onClose();
        navigate("/login");
      }
      return;
    }

    generateNotesPDF({
      subjectName: subject.name,
      assignedTeacher: subject.assignedTeacher,
      notesList: [note],
    });
  };

  const handleDownloadSelectedPDF = () => {
    if (!currentUser) {
      if (window.confirm("Please sign in or register to download PDF study notes.")) {
        onClose();
        navigate("/login");
      }
      return;
    }

    const selectedNotes = allNotes.filter((n) => selectedNoteIds.has(n.id));
    if (selectedNotes.length === 0) {
      alert("Please select at least one study note to download.");
      return;
    }

    generateNotesPDF({
      subjectName: subject.name,
      assignedTeacher: subject.assignedTeacher,
      notesList: selectedNotes,
    });
  };

  return (
    <div className="sub-modal-backdrop" onClick={onClose}>
      <div className="sub-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* CLOSE BUTTON */}
        <button
          className="login-close"
          onClick={onClose}
          aria-label="Close subject modal"
          style={{ top: "20px", right: "24px" }}
        >
          ✕
        </button>

        {/* MODAL HEADER */}
        <div className="sub-modal-header">
          <div className="sub-modal-header-left">
            <div className="sub-modal-icon">{subject.icon || "📚"}</div>
            <div>
              <h2 className="sub-modal-title">{subject.name}</h2>
              <div className="sub-modal-badges">
                {subject.tamil && <span className="sub-badge tamil">🌐 {subject.tamil}</span>}
                <span className="sub-badge faculty">
                  👨‍🏫 Faculty: <strong>{subject.assignedTeacher || "Unassigned"}</strong>
                </span>
                <span className="sub-badge count">
                  📝 {viewMode === "assignments" ? `${subjectAssignments.length} Active Assignment(s)` : `${allNotes.length + customFiles.length} Resource(s)`}
                </span>
              </div>

              {/* VIEW MODE TOGGLE BUTTONS */}
              <div className="sub-mode-toggle-group">
                <button
                  type="button"
                  onClick={() => setViewMode("all")}
                  className={`sub-mode-toggle-btn all ${viewMode === "all" ? "active" : ""}`}
                >
                  📖 Study Notes ({rawCustomNotes.length + rawCustomFiles.length})
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("qbank")}
                  className={`sub-mode-toggle-btn qbank ${viewMode === "qbank" ? "active" : ""}`}
                >
                  ⭐ Question Bank ({rawCustomNotes.filter(isQuestionBankNote).length + rawCustomFiles.filter(isQuestionBankNote).length})
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("pdf_docs")}
                  className={`sub-mode-toggle-btn pdf_docs ${viewMode === "pdf_docs" ? "active" : ""}`}
                >
                  📄 PDF Documents ({rawCustomNotes.filter(isPDFDocument).length + rawCustomFiles.filter(isPDFDocument).length})
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("assignments")}
                  className={`sub-mode-toggle-btn assignments ${viewMode === "assignments" ? "active" : ""}`}
                >
                  📝 Assignments ({subjectAssignments.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY / UNIT FILTER TABS (Only for notes & files) */}
        {viewMode !== "assignments" && categories.length > 0 && (
          <div className="sub-filter-bar">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                className={`sub-filter-btn ${activeCategory === cat ? "active" : ""}`}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat === "All" ? "📚 All Notes" : cat === "Uploaded Files" ? "📂 Uploaded Files" : `📄 ${cat}`}
              </button>
            ))}
          </div>
        )}

        {/* ACTIVE EXPLORATION UNIT BANNER */}
        {viewMode !== "assignments" && categories.length > 0 && (
          <div className="sub-unit-active-banner">
            <span className="sub-unit-banner-tag">
              {viewMode === "qbank"
                ? `⭐ Curated Question Bank (${activeCategory})`
                : viewMode === "pdf_docs"
                ? `📄 PDF Documents (${activeCategory})`
                : activeCategory === "All"
                ? "🌐 Exploring Curriculum (All Units)"
                : activeCategory === "Uploaded Files"
                ? "📂 Exploring All Uploaded Resources"
                : `🎯 Exploring Only ${activeCategory}`}
            </span>
            <span className="sub-unit-banner-info">
              {viewMode === "qbank"
                ? `Showing ${filteredNotes.length} Q&A item(s) for ${activeCategory}`
                : viewMode === "pdf_docs"
                ? `Showing ${filteredNotes.length} PDF note(s) & ${filteredFiles.length} file(s) for ${activeCategory}`
                : activeCategory === "All"
                ? `Showing all ${allNotes.length} note(s) & ${customFiles.length} file(s) across curriculum`
                : activeCategory === "Uploaded Files"
                ? `Showing all ${customFiles.length} uploaded file(s) and photos`
                : `Showing ${filteredNotes.length} note(s) & ${filteredFiles.length} file(s) for ${activeCategory}`}
            </span>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <div className="sub-modal-content">
          {/* LOGGED-OUT PROTECTION NOTICE */}
          {!currentUser && (
            <div
              style={{
                background: "rgba(139, 92, 246, 0.12)",
                border: "1px dashed rgba(139, 92, 246, 0.4)",
                borderRadius: "14px",
                padding: "16px 20px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h4 style={{ color: "#ffffff", margin: "0 0 4px 0", fontSize: "1rem" }}>
                  🔒 Faculty Notes & Materials Protected
                </h4>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.86rem" }}>
                  Please sign in as a student or faculty to access faculty-given study notes, uploaded PDFs, and assignments for {subject.name}.
                </p>
              </div>
              <button
                type="button"
                className="primary-btn"
                style={{ padding: "8px 16px", fontSize: "0.85rem", whiteSpace: "nowrap" }}
                onClick={() => {
                  onClose();
                  navigate("/login");
                }}
              >
                🔐 Sign In / Register
              </button>
            </div>
          )}


          {viewMode === "assignments" ? (
            <div style={{ padding: "10px 0" }}>
              {/* ASSIGNMENTS PORTAL HEADER & ACTIONS */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  padding: "16px 20px",
                  borderRadius: "16px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h3 style={{ color: "#ffffff", fontSize: "1.2rem", margin: "0 0 4px 0", fontFamily: "var(--font-heading)" }}>
                    📝 Course Assignment & Student Submission Portal
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: 0 }}>
                    {currentUser?.role === "faculty" || currentUser?.role === "admin"
                      ? `Create unit assignments, view student PDF uploads, and grade submissions for ${subject.name}.`
                      : `View homework tasks, upload & submit assignment PDFs for ${subject.name}, and track your grades & feedback.`}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {currentUser?.role !== "faculty" && (
                    <button
                      type="button"
                      className="sub-btn-batch-download"
                      style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)", border: "none", display: "flex", alignItems: "center", gap: "6px" }}
                      onClick={() => setShowDirectUploadBox(!showDirectUploadBox)}
                    >
                      📤 {showDirectUploadBox ? "Hide Quick Upload" : "Quick Submit Any Unit Assignment"}
                    </button>
                  )}

                  {(currentUser?.role === "faculty" || currentUser?.role === "admin") && (
                    <button
                      type="button"
                      className="sub-btn-batch-download"
                      style={{ background: "linear-gradient(135deg, #0284c7, #38bdf8)", border: "none", display: "flex", alignItems: "center", gap: "6px" }}
                      onClick={() => setShowCreateAssignmentModal(true)}
                    >
                      ➕ Create New Assignment
                    </button>
                  )}
                </div>
              </div>

              {/* STUDENT QUICK DIRECT UNIT UPLOAD BOX */}
              {showDirectUploadBox && currentUser?.role !== "faculty" && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "20px",
                    background: "rgba(13, 148, 136, 0.12)",
                    border: "1px dashed rgba(20, 184, 166, 0.4)",
                    borderRadius: "16px",
                  }}
                >
                  <h4 style={{ color: "#ffffff", fontSize: "1.05rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    📤 Direct Assignment Upload for {subject.name}
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "4px" }}>Select Unit *</label>
                      <select
                        value={directSubmitUnit}
                        onChange={(e) => setDirectSubmitUnit(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                      >
                        <option value="Unit 1">Unit 1</option>
                        <option value="Unit 2">Unit 2</option>
                        <option value="Unit 3">Unit 3</option>
                        <option value="Unit 4">Unit 4</option>
                        <option value="Unit 5">Unit 5</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "4px" }}>Choose File (PDF/Doc/Image) *</label>
                      <input
                        type="file"
                        accept=".pdf,image/*,.doc,.docx"
                        onChange={(e) => setStudentFileObj(e.target.files[0])}
                        style={{ width: "100%", color: "#ffffff", fontSize: "0.88rem" }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "4px" }}>Student Remarks / Register Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul S - Reg No: 211422106001 - Unit 1 Assignment"
                      value={studentRemarks}
                      onChange={(e) => setStudentRemarks(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setShowDirectUploadBox(false)}
                      style={{ padding: "6px 14px" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="sub-btn-batch-download"
                      style={{ padding: "6px 20px", background: "linear-gradient(135deg, #0d9488, #14b8a6)", border: "none" }}
                      onClick={() => handleStudentSubmitAssignment(null, directSubmitUnit)}
                    >
                      🚀 Submit Assignment to Faculty
                    </button>
                  </div>
                </div>
              )}

              {/* ASSIGNMENT CARDS LIST */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {subjectAssignments.map((assign) => {
                  const assignSubmissions = customSubmissionsState.filter((s) => s.assignmentId === assign.id);
                  const studentSub = customSubmissionsState.find(
                    (s) => s.assignmentId === assign.id && (s.studentName === currentUser?.name || currentUser?.role !== "faculty")
                  ) || assignSubmissions[0];

                  const isFacultyOrAdmin = currentUser?.role === "faculty" || currentUser?.role === "admin";
                  const isSubmitted = !!studentSub;
                  const isGraded = studentSub?.status === "Graded";

                  return (
                    <div
                      key={assign.id}
                      className="sub-note-card"
                      style={{ borderLeft: "4px solid #38bdf8", padding: "20px" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                            <span className="sub-note-type-tag lecture" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}>
                              📝 Assignment
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "var(--accent-purple-light)", fontWeight: 600 }}>
                              {assign.unit}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "#fde047", background: "rgba(234, 179, 8, 0.15)", padding: "2px 8px", borderRadius: "12px", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
                              ⭐ Max Marks: {assign.maxMarks}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "#a7f3d0", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                              📅 Due: {assign.dueDate}
                            </span>
                          </div>

                          <h3 className="sub-note-title" style={{ fontSize: "1.2rem", marginBottom: "6px" }}>
                            {assign.title}
                          </h3>
                          <p className="sub-note-desc" style={{ fontSize: "0.92rem", marginBottom: "10px", lineHeight: 1.5 }}>
                            {assign.description}
                          </p>
                        </div>

                        {isFacultyOrAdmin && (
                          <button
                            type="button"
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "#fca5a5",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            onClick={() => handleDeleteAssignment(assign.id)}
                          >
                            🗑️ Delete Task
                          </button>
                        )}
                      </div>

                      {/* FACULTY VIEW: SUBMISSIONS EVALUATION TRACKER */}
                      {isFacultyOrAdmin ? (
                        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <span style={{ fontSize: "0.9rem", color: "#ffffff", fontWeight: 600 }}>
                              📥 Student Submissions ({assignSubmissions.length})
                            </span>
                            <button
                              type="button"
                              style={{
                                padding: "6px 14px",
                                borderRadius: "8px",
                                background: evaluatingAssignId === assign.id ? "rgba(139, 92, 246, 0.3)" : "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                color: "#ffffff",
                                fontSize: "0.82rem",
                                cursor: "pointer",
                              }}
                              onClick={() => setEvaluatingAssignId(evaluatingAssignId === assign.id ? null : assign.id)}
                            >
                              {evaluatingAssignId === assign.id ? "🔼 Hide Submissions" : "👁️ Evaluate & Grade Submissions"}
                            </button>
                          </div>

                          {evaluatingAssignId === assign.id && (
                            <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: "12px", padding: "14px", marginTop: "10px" }}>
                              {assignSubmissions.length === 0 ? (
                                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
                                  No students have submitted responses for this assignment yet.
                                </p>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                  {assignSubmissions.map((sub) => {
                                    const currentScore = gradingScores[sub.id]?.marks ?? (sub.marks !== null ? sub.marks : "");
                                    const currentFeedback = gradingScores[sub.id]?.feedback ?? (sub.feedback || "");

                                    return (
                                      <div key={sub.id} style={{ padding: "12px 14px", background: "rgba(255, 255, 255, 0.04)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                                          <div>
                                            <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>👨‍🎓 {sub.studentName}</strong>
                                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "8px" }}>
                                              • Submitted: {sub.submittedAt}
                                            </span>
                                          </div>
                                          <span style={{ fontSize: "0.78rem", padding: "2px 8px", borderRadius: "10px", background: sub.status === "Graded" ? "rgba(16, 185, 129, 0.2)" : "rgba(234, 179, 8, 0.2)", color: sub.status === "Graded" ? "#6ee7b7" : "#fde047" }}>
                                            {sub.status === "Graded" ? `⭐ Graded (${sub.marks}/${assign.maxMarks})` : "⏳ Pending Grade"}
                                          </span>
                                        </div>

                                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                                          <span>📄 File: <code>{sub.fileName}</code> ({sub.fileSize})</span>
                                          <button
                                            type="button"
                                            style={{ padding: "3px 10px", borderRadius: "6px", background: "rgba(6, 182, 212, 0.2)", color: "#22d3ee", border: "1px solid rgba(6, 182, 212, 0.4)", fontSize: "0.78rem", cursor: "pointer" }}
                                            onClick={() => handleDownloadSubmissionFile(sub)}
                                          >
                                            📥 Download Submitted File
                                          </button>
                                        </div>

                                        {/* GRADING INPUT ROW */}
                                        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: "10px", alignItems: "center" }}>
                                          <div>
                                            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)" }}>Marks (Max {assign.maxMarks})</label>
                                            <input
                                              type="number"
                                              max={assign.maxMarks}
                                              min={0}
                                              placeholder={`0-${assign.maxMarks}`}
                                              value={currentScore}
                                              onChange={(e) => setGradingScores({
                                                ...gradingScores,
                                                [sub.id]: { ...gradingScores[sub.id], marks: e.target.value, feedback: currentFeedback }
                                              })}
                                              style={{ width: "100%", padding: "6px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#ffffff" }}
                                            />
                                          </div>

                                          <div>
                                            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)" }}>Faculty Feedback / Comments</label>
                                            <input
                                              type="text"
                                              placeholder="e.g. Good derivation steps, review problem 2"
                                              value={currentFeedback}
                                              onChange={(e) => setGradingScores({
                                                ...gradingScores,
                                                [sub.id]: { ...gradingScores[sub.id], marks: currentScore, feedback: e.target.value }
                                              })}
                                              style={{ width: "100%", padding: "6px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#ffffff" }}
                                            />
                                          </div>

                                          <button
                                            type="button"
                                            style={{ padding: "7px 14px", borderRadius: "8px", background: "linear-gradient(135deg, #10b981, #059669)", color: "#ffffff", border: "none", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", alignSelf: "end" }}
                                            onClick={() => handleSaveStudentGrade(sub.id, assign.maxMarks)}
                                          >
                                            💾 Save Grade
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* STUDENT VIEW: SUBMISSION FORM & GRADE DISPLAY */
                        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                          {isGraded ? (
                            <div style={{ padding: "12px 16px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "10px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "#6ee7b7", fontWeight: 700, fontSize: "1rem" }}>
                                  ⭐ Grade Awarded: {studentSub.marks} / {assign.maxMarks} Marks
                                </span>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Graded by Faculty</span>
                              </div>
                              {studentSub.feedback && (
                                <p style={{ color: "#ffffff", fontSize: "0.88rem", marginTop: "6px", margin: "6px 0 0 0" }}>
                                  💬 <em>Faculty Feedback: "{studentSub.feedback}"</em>
                                </p>
                              )}
                            </div>
                          ) : isSubmitted ? (
                            <div style={{ padding: "12px 16px", background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ color: "#22d3ee", fontWeight: 600, fontSize: "0.9rem" }}>
                                  ✅ Submitted: {studentSub.fileName}
                                </span>
                                <button
                                  type="button"
                                  style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(6, 182, 212, 0.2)", color: "#22d3ee", border: "1px solid rgba(6, 182, 212, 0.4)", fontSize: "0.78rem", cursor: "pointer" }}
                                  onClick={() => handleDownloadSubmissionFile(studentSub)}
                                >
                                  📥 Download File
                                </button>
                              </div>
                              <button
                                type="button"
                                style={{ padding: "6px 12px", borderRadius: "6px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff", fontSize: "0.8rem", cursor: "pointer" }}
                                onClick={() => setSubmittingAssignId(assign.id)}
                              >
                                🔄 Resubmit File
                              </button>
                            </div>
                          ) : (
                            <div>
                              {submittingAssignId === assign.id ? (
                                <div style={{ padding: "14px", background: "rgba(255, 255, 255, 0.03)", border: "1px dashed rgba(56, 189, 248, 0.4)", borderRadius: "12px" }}>
                                  <h4 style={{ color: "#ffffff", fontSize: "0.95rem", marginBottom: "10px" }}>📤 Upload Your Assignment Submission</h4>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <input
                                      type="file"
                                      accept=".pdf,image/*,.doc,.docx"
                                      onChange={(e) => setStudentFileObj(e.target.files[0])}
                                      style={{ color: "#ffffff", fontSize: "0.88rem" }}
                                    />
                                    <input
                                      type="text"
                                      placeholder="Optional remarks/comments for faculty..."
                                      value={studentRemarks}
                                      onChange={(e) => setStudentRemarks(e.target.value)}
                                      style={{ padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff", fontSize: "0.88rem" }}
                                    />
                                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "6px" }}>
                                      <button
                                        type="button"
                                        className="secondary-btn"
                                        style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                                        onClick={() => setSubmittingAssignId(null)}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="sub-btn-batch-download"
                                        style={{ padding: "6px 16px", fontSize: "0.82rem", background: "linear-gradient(135deg, #0284c7, #38bdf8)" }}
                                        onClick={() => handleStudentSubmitAssignment(assign)}
                                      >
                                        📤 Submit Assignment Now
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="sub-btn-batch-download"
                                  style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #0284c7, #38bdf8)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                                  onClick={() => setSubmittingAssignId(assign.id)}
                                >
                                  📤 Click to Submit Your Assignment Response PDF
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : allNotes.length === 0 && customFiles.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px 24px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px dashed rgba(139, 92, 246, 0.3)",
                borderRadius: "20px",
                margin: "10px 0",
              }}
            >
              <span style={{ fontSize: "3rem", display: "block", marginBottom: "14px" }}>
                {!currentUser ? "🔒" : viewMode === "qbank" ? "⭐" : viewMode === "pdf_docs" ? "📄" : "📭"}
              </span>
              <h3 style={{ fontSize: "1.3rem", color: "#ffffff", marginBottom: "8px", fontFamily: "var(--font-heading)" }}>
                {!currentUser
                  ? "Faculty Notes & Materials Protected"
                  : viewMode === "qbank"
                  ? "No Question Bank Q&A Notes Published Yet"
                  : viewMode === "pdf_docs"
                  ? "No PDF Documents Published Yet"
                  : "No Published Notes or Files Yet"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "480px", margin: "0 auto 20px auto", lineHeight: 1.5 }}>
                {!currentUser
                  ? `Please sign in to view faculty-given study notes, 2-mark & 16-mark question banks, uploaded PDFs, and assignments for ${subject.name}.`
                  : viewMode === "qbank"
                  ? currentUser?.role === "faculty"
                    ? `You haven't published any Q&A questions for ${subject.name} yet. Use 'Create Notes & Upload Files' and select format type '2-Mark Q&A', '13-Mark Derivation', or '16-Mark Problem' to publish your first question bank item!`
                    : `Assigned faculty (${subject.assignedTeacher || "Faculty"}) has not published Q&A question bank notes for ${subject.name} yet. Check back soon!`
                  : viewMode === "pdf_docs"
                  ? currentUser?.role === "faculty"
                    ? `You haven't published any PDF Documents for ${subject.name} yet. Use 'Create Notes & Upload Files' and select format type 'PDF Document' to publish!`
                    : `Assigned faculty (${subject.assignedTeacher || "Faculty"}) has not published PDF Documents for ${subject.name} yet. Check back soon!`
                  : currentUser?.role === "faculty"
                  ? `You haven't published any notes or uploaded resources for ${subject.name} yet. Use 'Create Notes & Upload Files' to publish your first note!`
                  : `Assigned faculty (${subject.assignedTeacher || "Faculty"}) has not published study notes or files for ${subject.name} yet. Check back soon!`}
              </p>
              {!currentUser && (
                <button
                  className="primary-btn"
                  style={{ padding: "10px 24px", fontSize: "0.9rem" }}
                  onClick={() => {
                    onClose();
                    navigate("/login");
                  }}
                >
                  🔐 Sign In / Register to Access Notes
                </button>
              )}
            </div>
          ) : filteredNotes.length === 0 && filteredFiles.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 24px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px dashed rgba(139, 92, 246, 0.3)",
                borderRadius: "16px",
              }}
            >
              <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "10px" }}>📄</span>
              <h4 style={{ color: "#ffffff", marginBottom: "6px" }}>No Notes or Files Published for {activeCategory}</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Switch to "All" or "Uploaded Files" tab to view published resources for this subject.
              </p>
            </div>
          ) : (
            <>
              {/* UPLOADED FILES SECTION FOR THIS UNIT / CATEGORY */}
              {filteredFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: filteredNotes.length > 0 ? "24px" : "0" }}>
                  <div style={{ padding: "12px 16px", background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: "12px", color: "var(--accent-cyan)", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>📂 Uploaded Files & Photos for <strong>{activeCategory === "All" || activeCategory === "Uploaded Files" ? subject.name : activeCategory}</strong> ({filteredFiles.length})</span>
                    <span style={{ fontSize: "0.78rem", opacity: 0.8 }}>PDFs, Photos & Lab Manuals</span>
                  </div>

                  {filteredFiles.map((file) => (
                    <div key={file.id} className="sub-note-card" style={{ borderLeft: "4px solid var(--accent-cyan)" }}>
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        {file.isImage && file.previewUrl ? (
                          <img
                            src={file.previewUrl}
                            alt={file.title}
                            style={{ width: "90px", height: "90px", borderRadius: "10px", objectFit: "cover", border: "1px solid var(--border-subtle)" }}
                          />
                        ) : (
                          <div style={{ fontSize: "2.5rem", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(139, 92, 246, 0.1)", borderRadius: "12px" }}>
                            {file.fileType.includes("Photo") ? "🖼️" : file.fileType.includes("Lab") ? "📁" : "📄"}
                          </div>
                        )}

                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                            <span className="sub-note-type-tag lecture" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee", borderColor: "rgba(6, 182, 212, 0.3)" }}>
                              {file.fileType}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "var(--accent-purple-light)", fontWeight: 600 }}>
                              {file.unit}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              • {file.fileSize}
                            </span>
                          </div>

                          <h3 className="sub-note-title" style={{ fontSize: "1.15rem", marginBottom: "6px" }}>
                            {file.title}
                          </h3>
                          <p className="sub-note-desc" style={{ fontSize: "0.9rem", marginBottom: "8px" }}>
                            {file.description}
                          </p>

                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            📄 File: <code>{file.fileName}</code> • Uploaded {file.uploadedAt}
                          </div>
                        </div>
                      </div>

                      <div className="sub-note-actions" style={{ marginTop: "14px", flexWrap: "wrap", gap: "8px" }}>
                        <button
                          type="button"
                          className="sub-btn-explore"
                          onClick={() => handleViewResourceFile(file)}
                        >
                          👁️ View File / Photo
                        </button>
                        <button
                          type="button"
                          className="sub-btn-download-single"
                          onClick={() => handleDownloadResourceFile(file)}
                        >
                          📥 Download File
                        </button>

                        {isFacultyOrAdmin && (
                          <>
                            <button
                              type="button"
                              style={{
                                padding: "8px 14px",
                                borderRadius: "10px",
                                border: "1px solid rgba(234, 179, 8, 0.4)",
                                background: "rgba(234, 179, 8, 0.15)",
                                color: "#fde047",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              onClick={() =>
                                setEditingFile({
                                  id: file.id,
                                  title: file.title || "",
                                  fileType: file.fileType || "PDF Document",
                                  unit: file.unit || "Unit 1",
                                  description: file.description || "",
                                })
                              }
                            >
                              ✏️ Edit File
                            </button>
                            <button
                              type="button"
                              style={{
                                padding: "8px 14px",
                                borderRadius: "10px",
                                border: "1px solid rgba(239, 68, 68, 0.4)",
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#fca5a5",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              🗑️ Delete File
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* WRITTEN NOTES SECTION FOR THIS UNIT / CATEGORY */}
              {filteredNotes.length > 0 && (
                <>
                  <div className="sub-select-all-bar">
                    <label className="sub-checkbox-label">
                      <input
                        type="checkbox"
                        checked={
                          filteredNotes.length > 0 &&
                          filteredNotes.every((n) => selectedNoteIds.has(n.id))
                        }
                        onChange={toggleSelectAll}
                      />
                      Select All Written Notes ({filteredNotes.length} in view)
                    </label>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      Check specific notes to customize your PDF download
                    </span>
                  </div>

                  {filteredNotes.map((note) => {
                    const isSelected = selectedNoteIds.has(note.id);
                    const isExpanded = expandedNoteIds.has(note.id);

                    return (
                      <div
                        key={note.id}
                        className={`sub-note-card ${isSelected ? "selected" : ""}`}
                      >
                        <div className="sub-note-top">
                          <label
                            className="sub-checkbox-label"
                            onClick={(e) => e.stopPropagation()}
                            style={{ marginTop: "2px" }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectNote(note.id)}
                            />
                          </label>

                          <div className="sub-note-header-info">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span className={`sub-note-type-tag ${note.typeTagClass}`}>
                                {note.type}
                              </span>
                              <span style={{ fontSize: "0.8rem", color: "var(--accent-purple-light)", fontWeight: 600 }}>
                                {note.unit}
                              </span>
                            </div>

                            <h3 className="sub-note-title">{note.title}</h3>

                            <div className="sub-note-meta">
                              <span>⏱️ {note.readTime}</span>
                              <span>•</span>
                              <span>📄 Format: PDF / Printable</span>
                            </div>
                          </div>
                        </div>

                        <p className="sub-note-desc">{note.description}</p>

                        {/* INLINE EXPANDABLE READER */}
                        {isExpanded && note.sections && (
                          <div className="sub-note-reader">
                            {note.sections.map((sec, secIdx) => (
                              <div key={secIdx} className="sub-reader-section">
                                <span className="sub-reader-heading">{sec.heading}</span>
                                <p className="sub-reader-body">{sec.body}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ACTIONS */}
                        <div className="sub-note-actions" style={{ flexWrap: "wrap", gap: "8px" }}>
                          <button
                            type="button"
                            className="sub-btn-explore"
                            style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(124, 58, 237, 0.35))", borderColor: "#a855f7", color: "#e9d5ff", fontWeight: 700 }}
                            onClick={() => setSmartPreviewItem(note)}
                          >
                            ⚡ Smart Expanded Preview
                          </button>

                          <button
                            type="button"
                            className="sub-btn-explore"
                            onClick={() => toggleReadNote(note.id)}
                          >
                            {isExpanded ? "📖 Hide Quick Preview" : "👁️ Read Inline"}
                          </button>

                          <button
                            type="button"
                            className="sub-btn-download-single"
                            onClick={(e) => handleDownloadSinglePDF(note, e)}
                            title="Download PDF for this note only"
                          >
                            📥 Download PDF
                          </button>

                          {isFacultyOrAdmin && (
                            <>
                              <button
                                type="button"
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "10px",
                                  border: "1px solid rgba(234, 179, 8, 0.4)",
                                  background: "rgba(234, 179, 8, 0.15)",
                                  color: "#fde047",
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                onClick={() =>
                                  setEditingNote({
                                    id: note.id,
                                    title: note.title || "",
                                    type: note.type || "Lecture Notes",
                                    unit: note.unit || "Unit 1",
                                    description: note.description || "",
                                    heading: note.sections?.[0]?.heading || "",
                                    body: note.sections?.[0]?.body || "",
                                  })
                                }
                              >
                                ✏️ Edit Note
                              </button>

                              <button
                                type="button"
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "10px",
                                  border: "1px solid rgba(239, 68, 68, 0.4)",
                                  background: "rgba(239, 68, 68, 0.15)",
                                  color: "#fca5a5",
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                🗑️ Delete Note
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="sub-modal-footer">
          <div className="sub-footer-left">
            {viewMode !== "assignments" && (
              <span className="sub-selected-count">
                ✅ Selected: {selectedNoteIds.size} of {allNotes.length} notes
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {viewMode !== "assignments" && (
              <button
                type="button"
                className="sub-btn-batch-download"
                onClick={handleDownloadSelectedPDF}
                disabled={selectedNoteIds.size === 0}
              >
                📥 Download Selected Notes PDF ({selectedNoteIds.size})
              </button>
            )}

            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              style={{ padding: "11px 20px" }}
            >
              Close
            </button>
          </div>
        </div>

        {/* FACULTY CREATE ASSIGNMENT MODAL */}
        {showCreateAssignmentModal && (
          <div className="note-modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setShowCreateAssignmentModal(false)}>
            <div className="note-modal-card" style={{ maxWidth: "540px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setShowCreateAssignmentModal(false)}>✕</button>
              <h3 style={{ color: "#ffffff", fontSize: "1.3rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                📝 Create New Course Assignment
              </h3>
              <form onSubmit={handleCreateAssignmentSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Assignment 1: Operational Amplifier Frequency Response"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                      Unit *
                    </label>
                    <select
                      value={assignUnit}
                      onChange={(e) => setAssignUnit(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "#1e1e2e",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                    >
                      <option value="Unit 1">Unit 1</option>
                      <option value="Unit 2">Unit 2</option>
                      <option value="Unit 3">Unit 3</option>
                      <option value="Unit 4">Unit 4</option>
                      <option value="Unit 5">Unit 5</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={assignDueDate}
                      onChange={(e) => setAssignDueDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 10px",
                        background: "#1e1e2e",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                      Max Marks *
                    </label>
                    <input
                      type="number"
                      required
                      value={assignMaxMarks}
                      onChange={(e) => setAssignMaxMarks(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Assignment Instructions / Problem Statement
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide details, problem statements, or instructions for students..."
                    value={assignDesc}
                    onChange={(e) => setAssignDesc(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setShowCreateAssignmentModal(false)}
                    style={{ padding: "8px 16px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="sub-btn-batch-download"
                    style={{ padding: "8px 20px", background: "linear-gradient(135deg, #0284c7, #38bdf8)", border: "none" }}
                  >
                    🚀 Publish Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT NOTE MODAL */}
        {editingNote && (
          <div className="note-modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setEditingNote(null)}>
            <div className="note-modal-card" style={{ maxWidth: "560px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setEditingNote(null)}>✕</button>
              <h3 style={{ color: "#ffffff", fontSize: "1.3rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                ✏️ Edit Published Note
              </h3>
              <form onSubmit={handleSaveEditNote} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Note / Question Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingNote.title}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                      Unit / Module *
                    </label>
                    <select
                      value={editingNote.unit}
                      onChange={(e) => setEditingNote({ ...editingNote, unit: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "#1e1e2e",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                    >
                      <option value="Unit 1">Unit 1</option>
                      <option value="Unit 2">Unit 2</option>
                      <option value="Unit 3">Unit 3</option>
                      <option value="Unit 4">Unit 4</option>
                      <option value="Unit 5">Unit 5</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                      Note Format / Type *
                    </label>
                    <select
                      value={editingNote.type}
                      onChange={(e) => setEditingNote({ ...editingNote, type: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "#1e1e2e",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                    >
                      <option value="Lecture Notes">📚 Lecture Notes</option>
                      <option value="2-Mark Q&A">❓ 2-Mark Q&A</option>
                      <option value="13-Mark Derivation">📐 13-Mark Derivation</option>
                      <option value="16-Mark Problem">🧮 16-Mark Problem</option>
                      <option value="PDF Document">📄 PDF Document</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Brief Description
                  </label>
                  <input
                    type="text"
                    value={editingNote.description}
                    onChange={(e) => setEditingNote({ ...editingNote, description: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Section Heading (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingNote.heading}
                    onChange={(e) => setEditingNote({ ...editingNote, heading: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Full Note / Solution Content (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={editingNote.body}
                    onChange={(e) => setEditingNote({ ...editingNote, body: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setEditingNote(null)}
                    style={{ padding: "8px 16px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="sub-btn-batch-download"
                    style={{ padding: "8px 20px" }}
                  >
                    💾 Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT FILE MODAL */}
        {editingFile && (
          <div className="note-modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setEditingFile(null)}>
            <div className="note-modal-card" style={{ maxWidth: "520px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setEditingFile(null)}>✕</button>
              <h3 style={{ color: "#ffffff", fontSize: "1.3rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                ✏️ Edit Uploaded Resource File
              </h3>
              <form onSubmit={handleSaveEditFile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Resource Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingFile.title}
                    onChange={(e) => setEditingFile({ ...editingFile, title: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                      Unit / Module *
                    </label>
                    <select
                      value={editingFile.unit}
                      onChange={(e) => setEditingFile({ ...editingFile, unit: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "#1e1e2e",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                    >
                      <option value="Unit 1">Unit 1</option>
                      <option value="Unit 2">Unit 2</option>
                      <option value="Unit 3">Unit 3</option>
                      <option value="Unit 4">Unit 4</option>
                      <option value="Unit 5">Unit 5</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                      Format Type *
                    </label>
                    <select
                      value={editingFile.fileType}
                      onChange={(e) => setEditingFile({ ...editingFile, fileType: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "#1e1e2e",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                    >
                      <option value="PDF Document">📄 PDF Document</option>
                      <option value="Lecture Notes">📚 Lecture Notes</option>
                      <option value="2-Mark Q&A">❓ 2-Mark Q&A</option>
                      <option value="13-Mark Derivation">📐 13-Mark Derivation</option>
                      <option value="16-Mark Problem">🧮 16-Mark Problem</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Brief Description
                  </label>
                  <input
                    type="text"
                    value={editingFile.description}
                    onChange={(e) => setEditingFile({ ...editingFile, description: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setEditingFile(null)}
                    style={{ padding: "8px 16px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="sub-btn-batch-download"
                    style={{ padding: "8px 20px" }}
                  >
                    💾 Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {smartPreviewItem && (
          <SmartExpandedPreviewModal
            item={smartPreviewItem}
            subject={subject}
            currentUser={currentUser}
            onClose={() => setSmartPreviewItem(null)}
            onDownload={(itemToDl) => {
              if (itemToDl.previewUrl) handleDownloadResourceFile(itemToDl);
              else handleDownloadSinglePDF(itemToDl, { stopPropagation: () => {} });
            }}
          />
        )}
      </div>
    </div>
  );
}
