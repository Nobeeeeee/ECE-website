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
  subscribeAllSubmissions,
  gradeStudentSubmissionInFirestore,
  saveManualStudentGradeToFirestore,
  createAssignmentInFirestore,
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
  const { currentUser, logout, users } = useAuth();

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

  const defaultFallbackSubjects = [
    {
      id: "sub_ec8701",
      name: "Wireless Communication & Networking",
      tamil: "வயர்லெஸ் தகவல் தொடர்பு மற்றும் நெட்வொர்க்கிங்",
      code: "EC8701",
      assignedTeacher: "Dr. K. Ramanathan, M.E., Ph.D.",
      icon: "📡",
    },
    {
      id: "sub_ec8553",
      name: "Digital Signal Processing",
      tamil: "டிஜிட்டல் சிக்னல் செயலாக்கம்",
      code: "EC8553",
      assignedTeacher: "Prof. S. Priya, M.Tech.",
      icon: "📊",
    },
    {
      id: "sub_ec8651",
      name: "Transmission Lines & RF Systems",
      tamil: "டிரான்ஸ்மிஷன் கோடுகள் மற்றும் RF அமைப்புகள்",
      code: "EC8651",
      assignedTeacher: "Dr. M. Suresh, M.E., Ph.D.",
      icon: "⚡",
    },
  ];

  const availableSubjects = facultyAssignedSubjects.length > 0
    ? facultyAssignedSubjects
    : subjects.length > 0
    ? subjects
    : defaultFallbackSubjects;

  // Persistent custom submissions state (filtered to remove dummy students)
  const [customSubmissions, setCustomSubmissions] = useState(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_submissions");
      const list = saved ? JSON.parse(saved) : [];
      const cleanList = list.filter(
        (s) =>
          !s.id?.startsWith("sub_demo_") &&
          !["730421106001", "730421106002", "730421106003"].includes(s.studentIdentifier)
      );
      localStorage.setItem("studynotes_custom_submissions", JSON.stringify(cleanList));
      return cleanList;
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("studynotes_custom_submissions", JSON.stringify(customSubmissions));
    } catch (e) {
      console.error("Failed to save custom submissions to localStorage", e);
    }
  }, [customSubmissions]);

  // Purge any dummy submissions from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("studynotes_custom_submissions");
      if (saved) {
        const list = JSON.parse(saved);
        const cleanList = list.filter(
          (s) =>
            !s.id?.startsWith("sub_demo_") &&
            !["730421106001", "730421106002", "730421106003"].includes(s.studentIdentifier)
        );
        if (cleanList.length !== list.length) {
          localStorage.setItem("studynotes_custom_submissions", JSON.stringify(cleanList));
          setCustomSubmissions(cleanList);
        }
      }
    } catch (e) {
      console.warn("Could not purge dummy submissions from localStorage", e);
    }
  }, []);

  // Real-time Firestore Submissions Listener
  useEffect(() => {
    const unsub = subscribeAllSubmissions((fsSubs) => {
      if (fsSubs && fsSubs.length > 0) {
        setCustomSubmissions((prev) => {
          const map = new Map();
          prev.forEach((s) => map.set(s.id, s));
          fsSubs.forEach((s) => {
            if (!s.id?.startsWith("sub_demo_") && !["730421106001", "730421106002", "730421106003"].includes(s.studentIdentifier)) {
              map.set(s.id, s);
            }
          });
          return Array.from(map.values());
        });
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Submitted Assignments Section State
  const [selectedSubmissionsCourse, setSelectedSubmissionsCourse] = useState("");
  const [submissionsSearch, setSubmissionsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'complete', 'partial', 'none'
  const [gradingInputs, setGradingInputs] = useState({});
  const [savingGradeId, setSavingGradeId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // De-cluttered Submissions Portal State
  const [submissionsViewMode, setSubmissionsViewMode] = useState("students"); // 'students' | 'assignment' | 'gradebook'
  const [selectedAssignViewId, setSelectedAssignViewId] = useState("");
  const [expandedStudents, setExpandedStudents] = useState(() => new Set());
  const [offlineEntryOpenMap, setOfflineEntryOpenMap] = useState({});

  const toggleStudentExpand = (regNo) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(regNo)) {
        next.delete(regNo);
      } else {
        next.add(regNo);
      }
      return next;
    });
  };

  const toggleAllStudents = () => {
    if (expandedStudents.size === filteredStudentRows.length) {
      setExpandedStudents(new Set());
    } else {
      setExpandedStudents(new Set(filteredStudentRows.map((s) => s.regNo)));
    }
  };

  const toggleOfflineEntry = (key) => {
    setOfflineEntryOpenMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Manual Grade Modal State (for students who haven't submitted online)
  const [showManualGradeModal, setShowManualGradeModal] = useState(false);
  const [manualGradeData, setManualGradeData] = useState({
    subjectId: "",
    assignmentId: "",
    regNo: "",
    studentName: "",
    marks: "",
    feedback: "Physical assignment evaluated offline",
  });
  const [isSubmittingManualGrade, setIsSubmittingManualGrade] = useState(false);

  // Quick Create Assignment Modal State
  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);
  const [quickAssignData, setQuickAssignData] = useState({
    subjectId: "",
    unit: "Unit 1",
    title: "",
    dueDate: "",
    maxMarks: 20,
    desc: "",
  });
  const [isCreatingQuickAssign, setIsCreatingQuickAssign] = useState(false);

  // Default selected course once subjects load
  useEffect(() => {
    if (!selectedSubmissionsCourse && availableSubjects.length > 0) {
      setSelectedSubmissionsCourse(availableSubjects[0].id);
    }
  }, [availableSubjects, selectedSubmissionsCourse]);

  const activeCourse = availableSubjects.find((s) => s.id === selectedSubmissionsCourse) || availableSubjects[0] || null;

  // Filter assignments for the selected active course
  const currentCourseAssignments = activeCourse
    ? customAssignments.filter((a) => {
        if (a.subjectId === activeCourse.id) return true;
        const normName = (activeCourse.name || "").trim().toLowerCase();
        const normCode = (activeCourse.code || "").trim().toLowerCase();
        if (normName && a.subjectName?.trim().toLowerCase() === normName) return true;
        if (normCode && a.subjectCode?.trim().toLowerCase() === normCode) return true;
        return false;
      })
    : [];

  // Seed sample assignments & submissions if empty so the user's Assignment 1 & 2 example is immediately visible
  useEffect(() => {
    if (activeCourse && currentCourseAssignments.length === 0 && customAssignments.length === 0) {
      const demo1 = {
        id: `assignment_demo_1_${activeCourse.id}`,
        subjectId: activeCourse.id,
        subjectName: activeCourse.name,
        subjectCode: activeCourse.code || "",
        unit: "Unit 1",
        title: "Assignment 1: Transmission Lines & Smith Chart Analysis",
        description: "Solve problems on impedance matching, calculate reflection coefficients, and attach handwritten derivations as PDF.",
        dueDate: "Oct 15, 2026",
        maxMarks: 20,
        createdBy: currentUser?.name || activeCourse.assignedTeacher || "Faculty",
        createdAt: "Sep 20, 2026",
      };
      const demo2 = {
        id: `assignment_demo_2_${activeCourse.id}`,
        subjectId: activeCourse.id,
        subjectName: activeCourse.name,
        subjectCode: activeCourse.code || "",
        unit: "Unit 2",
        title: "Assignment 2: Waveguides & Resonant Cavities",
        description: "Derive TE and TM wave propagation equations and calculate cutoff frequencies for rectangular waveguides.",
        dueDate: "Oct 25, 2026",
        maxMarks: 20,
        createdBy: currentUser?.name || activeCourse.assignedTeacher || "Faculty",
        createdAt: "Sep 22, 2026",
      };
      const initialAssigns = [demo1, demo2];
      setCustomAssignments(initialAssigns);
      localStorage.setItem("studynotes_custom_assignments", JSON.stringify(initialAssigns));

    }
  }, [activeCourse, currentCourseAssignments.length, customAssignments.length]);

  // Sync selected assignment for 'By Assignment' view
  useEffect(() => {
    if (currentCourseAssignments.length > 0) {
      if (!selectedAssignViewId || !currentCourseAssignments.some((a) => a.id === selectedAssignViewId)) {
        setSelectedAssignViewId(currentCourseAssignments[0].id);
      }
    } else {
      setSelectedAssignViewId("");
    }
  }, [currentCourseAssignments, selectedAssignViewId]);

  // Aggregate student rows for the active course
  const studentRows = (() => {
    if (!activeCourse) return [];

    const assignIds = new Set(currentCourseAssignments.map((a) => a.id));
    const studentMap = new Map();

    // 1. Registered students from AuthContext
    (users || [])
      .filter((u) => u.role === "student")
      .forEach((u) => {
        const reg = (u.identifier || u.email || "").trim();
        if (reg) {
          studentMap.set(reg, {
            regNo: reg,
            name: u.name || `Student (${reg})`,
            submissions: new Map(),
          });
        }
      });

    // 2. Real Submissions from students or manual entries
    customSubmissions.forEach((sub) => {
      const matchesCourse =
        sub.subjectId === activeCourse.id ||
        assignIds.has(sub.assignmentId) ||
        (sub.subjectName && sub.subjectName.toLowerCase() === activeCourse.name.toLowerCase());

      if (matchesCourse && sub.studentIdentifier) {
        const reg = sub.studentIdentifier.trim();
        if (!studentMap.has(reg)) {
          studentMap.set(reg, {
            regNo: reg,
            name: sub.studentName || `Student (${reg})`,
            submissions: new Map(),
          });
        }
        const studentObj = studentMap.get(reg);
        studentObj.submissions.set(sub.assignmentId, sub);
        if (sub.studentName && (!studentObj.name || studentObj.name.startsWith("Student ("))) {
          studentObj.name = sub.studentName;
        }
      }
    });

    const totalGiven = currentCourseAssignments.length;

    return Array.from(studentMap.values()).map((st) => {
      let submittedCount = 0;
      let gradedCount = 0;
      let totalMarksAwarded = 0;
      let totalMaxMarks = 0;

      currentCourseAssignments.forEach((assign) => {
        totalMaxMarks += Number(assign.maxMarks || 20);
        const sub = st.submissions.get(assign.id);
        if (sub) {
          submittedCount += 1;
          if (sub.status === "Graded") {
            gradedCount += 1;
            if (sub.marks !== undefined && sub.marks !== null) {
              totalMarksAwarded += Number(sub.marks);
            }
          }
        }
      });

      const percentage = totalGiven > 0 ? Math.round((submittedCount / totalGiven) * 100) : 0;

      return {
        ...st,
        submittedCount,
        gradedCount,
        totalMarksAwarded,
        totalMaxMarks,
        totalGiven,
        percentage,
        isCompleted: totalGiven > 0 && submittedCount === totalGiven,
        isPartial: submittedCount > 0 && submittedCount < totalGiven,
        isNone: submittedCount === 0,
      };
    }).sort((a, b) => b.submittedCount - a.submittedCount || a.regNo.localeCompare(b.regNo));
  })();

  const filteredStudentRows = studentRows.filter((st) => {
    if (submissionsSearch.trim()) {
      const q = submissionsSearch.trim().toLowerCase();
      const matchReg = st.regNo.toLowerCase().includes(q);
      const matchName = st.name.toLowerCase().includes(q);
      if (!matchReg && !matchName) return false;
    }
    if (statusFilter === "complete" && !st.isCompleted) return false;
    if (statusFilter === "partial" && !st.isPartial) return false;
    if (statusFilter === "none" && !st.isNone) return false;
    return true;
  });

  // Calculate quick stats for active course
  const totalSubmissionsInCourse = customSubmissions.filter((sub) => {
    return (
      sub.subjectId === activeCourse?.id ||
      currentCourseAssignments.some((a) => a.id === sub.assignmentId)
    );
  }).length;

  const totalGradedInCourse = customSubmissions.filter((sub) => {
    return (
      (sub.subjectId === activeCourse?.id || currentCourseAssignments.some((a) => a.id === sub.assignmentId)) &&
      sub.status === "Graded"
    );
  }).length;

  // Handlers for grading
  const handleSaveStudentGrade = async (subId, maxMarks = 20, studentRegNo = "") => {
    const input = gradingInputs[subId];
    if (!input || input.marks === undefined || input.marks === "") {
      alert("Please enter marks to award.");
      return;
    }

    const marksNum = parseInt(input.marks, 10);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
      alert(`Please enter valid marks between 0 and ${maxMarks}.`);
      return;
    }

    setSavingGradeId(subId);
    try {
      await gradeStudentSubmissionInFirestore(subId, {
        marks: marksNum,
        feedback: input.feedback || "Evaluated by faculty",
      });

      const updated = customSubmissions.map((s) => {
        if (s.id === subId) {
          return {
            ...s,
            marks: marksNum,
            feedback: input.feedback || "Evaluated by faculty",
            status: "Graded",
          };
        }
        return s;
      });

      setCustomSubmissions(updated);
      localStorage.setItem("studynotes_custom_submissions", JSON.stringify(updated));
      setToastMessage(`✅ Marks (${marksNum}/${maxMarks}) saved successfully for ${studentRegNo ? `Reg No: ${studentRegNo}` : "student"}!`);
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err) {
      console.error("Failed to save grade:", err);
      alert("Error saving grade: " + err.message);
    } finally {
      setSavingGradeId(null);
    }
  };

  const handleDirectGradeNonSubmitted = async (student, assign) => {
    const key = `${student.regNo}_${assign.id}`;
    const input = gradingInputs[key];
    if (!input || input.marks === undefined || input.marks === "") {
      alert("Please enter marks to award for this assignment.");
      return;
    }

    const marksNum = parseInt(input.marks, 10);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > assign.maxMarks) {
      alert(`Please enter valid marks between 0 and ${assign.maxMarks}.`);
      return;
    }

    setSavingGradeId(key);
    try {
      const newSubId = `manual_sub_${Date.now()}_${student.regNo.replace(/[^a-zA-Z0-9]/g, "")}`;
      const newSubmission = {
        id: newSubId,
        assignmentId: assign.id,
        assignmentTitle: assign.title,
        subjectId: assign.subjectId || activeCourse?.id || "",
        unit: assign.unit || "Unit 1",
        studentIdentifier: student.regNo,
        studentName: student.name,
        fileName: "Manual / Direct Evaluation",
        fileSize: "Offline",
        fileUrl: "",
        previewUrl: "",
        remarks: "Evaluated directly by faculty (no portal upload)",
        submittedAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        status: "Graded",
        marks: marksNum,
        feedback: input.feedback || "Offline paper evaluated by faculty",
        isManual: true,
      };

      await saveManualStudentGradeToFirestore(newSubmission);

      const filtered = customSubmissions.filter((s) => !(s.assignmentId === assign.id && s.studentIdentifier === student.regNo));
      const updated = [newSubmission, ...filtered];
      setCustomSubmissions(updated);
      localStorage.setItem("studynotes_custom_submissions", JSON.stringify(updated));

      setToastMessage(`🎉 Offline Mark (${marksNum}/${assign.maxMarks}) recorded for Reg No ${student.regNo}!`);
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err) {
      console.error("Failed to direct grade student:", err);
      alert("Error saving grade: " + err.message);
    } finally {
      setSavingGradeId(null);
    }
  };

  const handleOpenManualModal = (prefillReg = "") => {
    setManualGradeData({
      subjectId: activeCourse?.id || availableSubjects[0]?.id || "",
      assignmentId: currentCourseAssignments[0]?.id || "",
      regNo: prefillReg,
      studentName: "",
      marks: "",
      feedback: "Physical assignment evaluated offline",
    });
    setShowManualGradeModal(true);
  };

  const handleSaveManualModalGrade = async (e) => {
    e.preventDefault();
    if (!manualGradeData.regNo.trim()) {
      alert("Please enter the student's Register Number.");
      return;
    }
    if (!manualGradeData.assignmentId) {
      alert("Please select the assignment.");
      return;
    }

    const targetAssign = customAssignments.find((a) => a.id === manualGradeData.assignmentId);
    const maxMarks = targetAssign ? targetAssign.maxMarks : 20;
    const marksNum = parseInt(manualGradeData.marks, 10);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
      alert(`Please enter valid marks between 0 and ${maxMarks}.`);
      return;
    }

    setIsSubmittingManualGrade(true);
    try {
      const cleanReg = manualGradeData.regNo.trim();
      const matchedUser = (users || []).find((u) => (u.identifier || "").toLowerCase() === cleanReg.toLowerCase());
      const studentName = manualGradeData.studentName.trim() || matchedUser?.name || `Student (${cleanReg})`;

      const newSubId = `manual_sub_${Date.now()}_${cleanReg.replace(/[^a-zA-Z0-9]/g, "")}`;
      const newSubmission = {
        id: newSubId,
        assignmentId: manualGradeData.assignmentId,
        assignmentTitle: targetAssign?.title || "Course Assignment",
        subjectId: targetAssign?.subjectId || manualGradeData.subjectId || activeCourse?.id || "",
        subjectName: targetAssign?.subjectName || activeCourse?.name || "",
        unit: targetAssign?.unit || "Unit 1",
        studentIdentifier: cleanReg,
        studentName: studentName,
        fileName: "Offline / Physical Submission",
        fileSize: "N/A",
        fileUrl: "",
        previewUrl: "",
        remarks: "Manually recorded by faculty",
        submittedAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        status: "Graded",
        marks: marksNum,
        feedback: manualGradeData.feedback || "Evaluated offline by faculty",
        isManual: true,
      };

      await saveManualStudentGradeToFirestore(newSubmission);

      const filtered = customSubmissions.filter((s) => !(s.assignmentId === manualGradeData.assignmentId && s.studentIdentifier === cleanReg));
      const updated = [newSubmission, ...filtered];
      setCustomSubmissions(updated);
      localStorage.setItem("studynotes_custom_submissions", JSON.stringify(updated));

      setShowManualGradeModal(false);
      setToastMessage(`🎉 Mark (${marksNum}/${maxMarks}) recorded for Register No: ${cleanReg}!`);
      setTimeout(() => setToastMessage(""), 4500);
    } catch (err) {
      console.error("Failed to record manual grade:", err);
      alert("Error: " + err.message);
    } finally {
      setIsSubmittingManualGrade(false);
    }
  };

  const handleCreateQuickAssignment = async (e) => {
    e.preventDefault();
    if (!quickAssignData.title.trim()) return;

    setIsCreatingQuickAssign(true);
    try {
      const sub = availableSubjects.find((s) => s.id === (quickAssignData.subjectId || activeCourse?.id)) || activeCourse;
      const newAssignment = {
        id: `assignment_${Date.now()}`,
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code || "",
        unit: quickAssignData.unit || "Unit 1",
        title: quickAssignData.title.trim(),
        description: quickAssignData.desc.trim() || "Complete the questions and upload your response as a PDF or document.",
        dueDate: quickAssignData.dueDate.trim() || "Upcoming",
        maxMarks: parseInt(quickAssignData.maxMarks, 10) || 20,
        createdBy: currentUser?.name || sub.assignedTeacher || "Faculty",
        createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };

      await createAssignmentInFirestore(newAssignment);

      const updated = [newAssignment, ...customAssignments];
      setCustomAssignments(updated);
      localStorage.setItem("studynotes_custom_assignments", JSON.stringify(updated));

      setShowQuickAssignModal(false);
      setQuickAssignData({ subjectId: "", unit: "Unit 1", title: "", dueDate: "", maxMarks: 20, desc: "" });
      setToastMessage(`📝 Successfully created "${newAssignment.title}" for ${sub.name}!`);
      setTimeout(() => setToastMessage(""), 4500);
    } catch (err) {
      console.error("Failed to create assignment:", err);
      alert("Failed to create assignment: " + err.message);
    } finally {
      setIsCreatingQuickAssign(false);
    }
  };

  const handleDownloadSubmissionFile = (sub, courseName = "Course") => {
    if (sub.previewUrl || sub.fileUrl) {
      const link = document.createElement("a");
      link.href = sub.previewUrl || sub.fileUrl;
      link.download = sub.fileName || `${sub.studentName || "Student"}_Assignment.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const reportText =
        `STUDYNOTES ECE PORTAL - STUDENT ASSIGNMENT RECORD\n` +
        `==================================================\n` +
        `Student Name     : ${sub.studentName}\n` +
        `Register Number  : ${sub.studentIdentifier}\n` +
        `Course           : ${courseName}\n` +
        `Unit             : ${sub.unit || "N/A"}\n` +
        `Status           : ${sub.status}\n` +
        `Submitted Date   : ${sub.submittedAt}\n` +
        `Marks Awarded    : ${sub.marks !== null ? sub.marks : "Pending Evaluation"}\n` +
        `Faculty Feedback : ${sub.feedback || "None"}\n` +
        `Submission Type  : ${sub.isManual ? "Offline / Manual Entry" : "Online File Upload"}\n` +
        `Student Remarks  : ${sub.remarks || "No remarks provided"}\n` +
        `==================================================\n` +
        `Verified Academic Submission Log.`;

      const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sub.studentIdentifier}_${sub.unit || "Assign"}_Report.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportSubmissionsCSV = () => {
    if (!activeCourse || studentRows.length === 0) {
      alert("No student data available to export.");
      return;
    }

    const headers = [
      "Student Register Number",
      "Student Name",
      "Course Code",
      "Course Name",
      "Total Assignments Given",
      "Total Submitted",
      "Completion Percentage",
      ...currentCourseAssignments.map((a) => `"${a.title} (${a.unit}) - Status"`),
      ...currentCourseAssignments.map((a) => `"${a.title} (${a.unit}) - Marks (Max ${a.maxMarks})"`),
    ];

    const rows = studentRows.map((st) => {
      const statuses = currentCourseAssignments.map((a) => {
        const sub = st.submissions.get(a.id);
        if (!sub) return '"Not Submitted"';
        return sub.status === "Graded" ? `"Graded (${sub.marks}/${a.maxMarks})"` : '"Submitted (Pending)"';
      });

      const marks = currentCourseAssignments.map((a) => {
        const sub = st.submissions.get(a.id);
        if (!sub || sub.marks === null || sub.marks === undefined) return '"N/A"';
        return sub.marks;
      });

      return [
        `"${st.regNo}"`,
        `"${st.name}"`,
        `"${activeCourse.code || ""}"`,
        `"${activeCourse.name}"`,
        st.totalGiven,
        st.submittedCount,
        `"${st.percentage}%"`,
        ...statuses,
        ...marks,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeCourse.code || activeCourse.name}_Submissions_Marks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Faculty Create / Publish Notes Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishSubId, setPublishSubId] = useState("");
  const [publishUnit, setPublishUnit] = useState("Unit 1");
  const [publishNoteType, setPublishNoteType] = useState("Lecture Notes");
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
    if (isPublishingNote) return;

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

    const firstHeading = validSections[0]?.heading?.trim();
    const cleanHeading = (firstHeading && firstHeading !== "Notes Section")
      ? firstHeading
      : (uploadFileObj ? uploadFileObj.name : `${publishNoteType}`);

    const noteTitle = cleanHeading.toLowerCase().startsWith(unitName.toLowerCase())
      ? cleanHeading
      : `${unitName} — ${cleanHeading}`;

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
      title: noteTitle,
      readTime: "5 mins read • Printable",
      description: `Course study notes published by faculty for ${assignedSub.name}.`,
      publishedBy: currentUser?.name || assignedSub.assignedTeacher || "Faculty",
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      sections: validSections.length > 0 ? validSections : [
        {
          heading: cleanHeading,
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
          title: cleanHeading,
          description: `Reference file uploaded by faculty for ${assignedSub.name}.`,
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
      title: language === "English" ? "📤 Submitted Assignments & Marks" : "📤 சமர்ப்பிக்கப்பட்ட ஒப்படைப்புகள் & மதிப்பெண்கள்",
      description: "View student submissions with Register Numbers, track submitted count, award marks & evaluate offline students",
      badge: "Grading Portal",
      action: "scroll_to_submissions",
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
          <a href="#submitted-assignments" style={{ color: "#38bdf8", fontWeight: 700 }}>
            📥 Submitted Assignments
          </a>
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
            Welcome to your Faculty Portal. Manage course study notes, 2-mark & 16-mark question banks, and evaluate student assignment submissions by Register Number.
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
              onClick={() => document.getElementById("submitted-assignments")?.scrollIntoView({ behavior: "smooth" })}
              style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.4)", color: "#38bdf8", fontWeight: 600 }}
            >
              📥 Submitted Assignments ({customSubmissions.length})
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
              <span className="metric-icon">📥</span>
              <div className="metric-info">
                <h4>{customSubmissions.length}</h4>
                <p>Student Submissions</p>
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
                if (category.id === "fac_submissions" || category.action === "scroll_to_submissions") {
                  document.getElementById("submitted-assignments")?.scrollIntoView({ behavior: "smooth" });
                  return;
                }
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

      {/* ==========================================================================
          DECLUTTERED SUBMISSIONS & EVALUATION PORTAL
          ========================================================================== */}
      <section className="submitted-assignments-section" id="submitted-assignments">
        {/* HEADER & COURSE SELECTOR */}
        <div className="submissions-portal-header">
          <div className="portal-title-area">
            <span className="section-tag font-medium text-cyan-400">👨‍🏫 STUDENT SUBMISSIONS & EVALUATION PORTAL</span>
            <h2>📥 Submitted Assignments (மாணவர் ஒப்படைப்புகள் & மதிப்பெண்கள்)</h2>
            <p>
              Track student assignment submissions with their Register Number, inspect submitted work, enter & submit marks, or award grades directly for offline/non-submitted students.
            </p>
          </div>

          <div className="portal-header-actions">
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
                📚 Active Course:
              </label>
              <select
                className="course-select-dropdown"
                value={selectedSubmissionsCourse}
                onChange={(e) => setSelectedSubmissionsCourse(e.target.value)}
              >
                {availableSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", flexWrap: "wrap", paddingTop: "18px" }}>
              <button
                type="button"
                className="secondary-btn"
                style={{
                  padding: "8px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  color: "#38bdf8",
                }}
                onClick={() => {
                  setQuickAssignData({
                    subjectId: activeCourse?.id || "",
                    unit: "Unit 1",
                    title: "",
                    dueDate: "",
                    maxMarks: 20,
                    desc: "",
                  });
                  setShowQuickAssignModal(true);
                }}
              >
                📝 + Create Task
              </button>

              <button
                type="button"
                className="primary-btn"
                style={{
                  background: "linear-gradient(135deg, #10b981, #06b6d4)",
                  padding: "8px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onClick={() => handleOpenManualModal()}
              >
                ✍️ + Award Mark by Reg No
              </button>

              <button
                type="button"
                className="secondary-btn"
                style={{
                  padding: "8px 12px",
                  fontSize: "0.82rem",
                  color: "#94a3b8",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onClick={handleExportSubmissionsCSV}
                title="Download Excel / CSV sheet of all student submissions and marks"
              >
                📊 Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* COMPACT METRICS RIBBON */}
        <div className="submissions-metrics-ribbon">
          <div className="metric-ribbon-card">
            <div className="metric-ribbon-icon" style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8" }}>👨‍🎓</div>
            <div className="metric-ribbon-data">
              <h4>{studentRows.length}</h4>
              <p>Registered Students</p>
            </div>
          </div>

          <div className="metric-ribbon-card">
            <div className="metric-ribbon-icon" style={{ background: "rgba(168, 85, 247, 0.12)", color: "#c084fc" }}>📝</div>
            <div className="metric-ribbon-data">
              <h4>{currentCourseAssignments.length}</h4>
              <p>Given Tasks / Assigns</p>
            </div>
          </div>

          <div className="metric-ribbon-card">
            <div className="metric-ribbon-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#34d399" }}>📥</div>
            <div className="metric-ribbon-data">
              <h4>{totalSubmissionsInCourse}</h4>
              <p>Total Submissions</p>
            </div>
          </div>

          <div className="metric-ribbon-card">
            <div className="metric-ribbon-icon" style={{ background: "rgba(234, 179, 8, 0.12)", color: "#facc15" }}>⭐</div>
            <div className="metric-ribbon-data">
              <h4>{totalGradedInCourse} / {totalSubmissionsInCourse || 0}</h4>
              <p>Evaluated ({totalSubmissionsInCourse > 0 ? Math.round((totalGradedInCourse / totalSubmissionsInCourse) * 100) : 0}%)</p>
            </div>
          </div>
        </div>

        {/* VIEW MODE NAVIGATION BAR */}
        <div className="submissions-nav-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
              View Mode:
            </span>
            <div className="view-mode-tabs">
              <button
                type="button"
                className={`view-mode-tab-btn ${submissionsViewMode === "students" ? "active" : ""}`}
                onClick={() => setSubmissionsViewMode("students")}
              >
                👨‍🎓 By Student ({studentRows.length})
              </button>
              <button
                type="button"
                className={`view-mode-tab-btn ${submissionsViewMode === "assignment" ? "active" : ""}`}
                onClick={() => setSubmissionsViewMode("assignment")}
              >
                📝 By Assignment ({currentCourseAssignments.length})
              </button>
              <button
                type="button"
                className={`view-mode-tab-btn ${submissionsViewMode === "gradebook" ? "active" : ""}`}
                onClick={() => setSubmissionsViewMode("gradebook")}
              >
                📊 Gradebook Matrix
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-input-wrapper">
            <span className="search-input-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Reg No or Student Name..."
              value={submissionsSearch}
              onChange={(e) => setSubmissionsSearch(e.target.value)}
            />
          </div>
        </div>

        {/* SUBFILTERS ROW */}
        <div className="submissions-subfilters-row">
          <div className="status-filter-pills">
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>Filter:</span>
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All Students ({studentRows.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "complete" ? "active" : ""}`}
              onClick={() => setStatusFilter("complete")}
            >
              🟢 Completed ({studentRows.filter((s) => s.isCompleted).length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "partial" ? "active" : ""}`}
              onClick={() => setStatusFilter("partial")}
            >
              🟡 Partial ({studentRows.filter((s) => s.isPartial).length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "none" ? "active" : ""}`}
              onClick={() => setStatusFilter("none")}
            >
              🔴 Not Submitted ({studentRows.filter((s) => s.isNone).length})
            </button>
          </div>

          {submissionsViewMode === "students" && filteredStudentRows.length > 0 && (
            <button
              type="button"
              className="filter-pill-btn"
              onClick={toggleAllStudents}
              style={{
                borderColor: "rgba(56, 189, 248, 0.35)",
                color: "#38bdf8",
                background: "rgba(56, 189, 248, 0.08)",
              }}
            >
              {expandedStudents.size === filteredStudentRows.length ? "▲ Collapse All" : "▼ Expand All"}
            </button>
          )}
        </div>

        {/* =====================================================================
            VIEW MODE A: BY STUDENT (ACCORDION)
            ===================================================================== */}
        {submissionsViewMode === "students" && (
          <div className="student-cards-list">
            {filteredStudentRows.length > 0 ? (
              filteredStudentRows.map((st) => {
                const isExpanded = expandedStudents.has(st.regNo);
                return (
                  <div key={st.regNo} className={`student-card-item ${isExpanded ? "is-expanded" : ""}`}>
                    {/* ACCORDION HEADER */}
                    <div className="student-card-header" onClick={() => toggleStudentExpand(st.regNo)}>
                      <div className="student-info-left">
                        <div className="student-avatar">👨‍🎓</div>
                        <div>
                          <h4 className="student-name-title">
                            {st.name}
                          </h4>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px", flexWrap: "wrap" }}>
                            <span className="regno-badge" title="Student Register Number">
                              🆔 Reg No: {st.regNo}
                            </span>
                            <span className="score-chip-badge" title="Total Marks Scored">
                              ⭐ Total: {st.totalMarksAwarded} / {st.totalMaxMarks} Marks
                            </span>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                              • Evaluated: {st.gradedCount} of {st.submittedCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT STATUS & CHEVRON */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <div style={{ width: "90px", height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${st.percentage}%`,
                              height: "100%",
                              background: st.isCompleted ? "#10b981" : st.isPartial ? "#eab308" : "#ef4444",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>

                        {st.isCompleted && (
                          <span className="submission-count-pill complete">
                            🟢 {st.submittedCount} / {st.totalGiven}
                          </span>
                        )}
                        {st.isPartial && (
                          <span className="submission-count-pill partial">
                            🟡 {st.submittedCount} / {st.totalGiven}
                          </span>
                        )}
                        {st.isNone && (
                          <span className="submission-count-pill none">
                            🔴 0 / {st.totalGiven}
                          </span>
                        )}

                        <span className="expand-chevron-btn" style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "0.76rem" }}>
                          {isExpanded ? "▲ Hide Tasks" : `▼ View Tasks (${currentCourseAssignments.length})`}
                        </span>
                      </div>
                    </div>

                    {/* EXPANDABLE TASKS BODY */}
                    {isExpanded && (
                      <div className="student-tasks-wrapper">
                        <div className="assign-tasks-grid">
                          {currentCourseAssignments.length === 0 ? (
                            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                              No assignments created yet for this course. Click "+ Create Task" above.
                            </p>
                          ) : (
                            currentCourseAssignments.map((assign, aIdx) => {
                              const sub = st.submissions.get(assign.id);
                              const isSubmitted = !!sub;
                              const isGraded = sub?.status === "Graded";
                              const subScore = gradingInputs[sub?.id]?.marks ?? (sub?.marks !== null && sub?.marks !== undefined ? sub.marks : "");
                              const subFeedback = gradingInputs[sub?.id]?.feedback ?? (sub?.feedback || "");

                              const directKey = `${st.regNo}_${assign.id}`;
                              const directScore = gradingInputs[directKey]?.marks ?? "";
                              const directFeedback = gradingInputs[directKey]?.feedback ?? "Evaluated offline by faculty";
                              const isOfflineOpen = !!offlineEntryOpenMap[directKey];

                              return (
                                <div
                                  key={assign.id}
                                  className={`assign-task-card ${
                                    isGraded ? "graded" : isSubmitted ? "submitted" : "not-submitted"
                                  }`}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                    <div>
                                      <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#38bdf8" }}>
                                        Task #{aIdx + 1} ({assign.unit})
                                      </span>
                                      <h5 style={{ fontSize: "0.92rem", color: "#ffffff", margin: "2px 0", fontWeight: 600 }}>
                                        {assign.title}
                                      </h5>
                                    </div>
                                    <span style={{ fontSize: "0.75rem", color: "#fde047", background: "rgba(234, 179, 8, 0.15)", padding: "2px 6px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                                      Max: {assign.maxMarks}
                                    </span>
                                  </div>

                                  {isSubmitted ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                                        <span style={{ fontSize: "0.78rem", color: "#a7f3d0", fontWeight: 600 }}>
                                          ✅ Submitted: {sub.submittedAt}
                                        </span>
                                        <span style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "6px", background: isGraded ? "rgba(168, 85, 247, 0.2)" : "rgba(234, 179, 8, 0.2)", color: isGraded ? "#e9d5ff" : "#fde047", fontWeight: 700 }}>
                                          {isGraded ? `⭐ Graded (${sub.marks}/${assign.maxMarks})` : "⏳ Pending Grade"}
                                        </span>
                                      </div>

                                      {sub.isManual ? (
                                        <div style={{ fontSize: "0.78rem", color: "#fde047", background: "rgba(234, 179, 8, 0.08)", padding: "4px 8px", borderRadius: "6px" }}>
                                          ✍️ Offline / Class evaluation
                                        </div>
                                      ) : (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", background: "rgba(255, 255, 255, 0.04)", padding: "6px 10px", borderRadius: "6px" }}>
                                          <span style={{ fontSize: "0.78rem", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            📄 {sub.fileName || "Submitted PDF"}
                                          </span>
                                          <button
                                            type="button"
                                            style={{
                                              background: "rgba(56, 189, 248, 0.15)",
                                              border: "1px solid rgba(56, 189, 248, 0.4)",
                                              color: "#38bdf8",
                                              borderRadius: "6px",
                                              padding: "3px 8px",
                                              fontSize: "0.74rem",
                                              fontWeight: 600,
                                              cursor: "pointer",
                                              whiteSpace: "nowrap",
                                            }}
                                            onClick={() => handleDownloadSubmissionFile(sub, activeCourse?.name)}
                                          >
                                            📥 View
                                          </button>
                                        </div>
                                      )}

                                      {/* COMPACT INLINE GRADING */}
                                      <div style={{ display: "grid", gridTemplateColumns: "85px 1fr auto", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                                        <input
                                          type="number"
                                          min={0}
                                          max={assign.maxMarks}
                                          placeholder={`0-${assign.maxMarks}`}
                                          className="grade-input-box"
                                          value={subScore}
                                          onChange={(e) =>
                                            setGradingInputs({
                                              ...gradingInputs,
                                              [sub.id]: { ...gradingInputs[sub.id], marks: e.target.value, feedback: subFeedback },
                                            })
                                          }
                                        />
                                        <input
                                          type="text"
                                          placeholder="Feedback note..."
                                          className="grade-input-box"
                                          value={subFeedback}
                                          onChange={(e) =>
                                            setGradingInputs({
                                              ...gradingInputs,
                                              [sub.id]: { ...gradingInputs[sub.id], marks: subScore, feedback: e.target.value },
                                            })
                                          }
                                        />
                                        <button
                                          type="button"
                                          className="save-grade-btn"
                                          disabled={savingGradeId === sub.id}
                                          onClick={() => handleSaveStudentGrade(sub.id, assign.maxMarks, st.regNo)}
                                        >
                                          {savingGradeId === sub.id ? "⏳" : isGraded ? "💾 Save" : "🚀 Grade"}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* NON-SUBMITTED: CLEAN TOGGLEABLE OFFLINE FORM */
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                      <div className="offline-prompt-pill">
                                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                          ❌ Not Submitted Online
                                        </span>
                                        <button
                                          type="button"
                                          className="offline-open-btn"
                                          onClick={() => toggleOfflineEntry(directKey)}
                                        >
                                          {isOfflineOpen ? "✕ Close" : "✍️ + Award Offline Mark"}
                                        </button>
                                      </div>

                                      {isOfflineOpen && (
                                        <div style={{ display: "grid", gridTemplateColumns: "85px 1fr auto", gap: "6px", alignItems: "center", background: "rgba(234, 179, 8, 0.06)", padding: "8px", borderRadius: "8px", border: "1px dashed rgba(234, 179, 8, 0.3)" }}>
                                          <input
                                            type="number"
                                            min={0}
                                            max={assign.maxMarks}
                                            placeholder={`0-${assign.maxMarks}`}
                                            className="grade-input-box"
                                            value={directScore}
                                            onChange={(e) =>
                                              setGradingInputs({
                                                ...gradingInputs,
                                                [directKey]: { ...gradingInputs[directKey], marks: e.target.value, feedback: directFeedback },
                                              })
                                            }
                                          />
                                          <input
                                            type="text"
                                            placeholder="Reason e.g. Physical paper"
                                            className="grade-input-box"
                                            value={directFeedback}
                                            onChange={(e) =>
                                              setGradingInputs({
                                                ...gradingInputs,
                                                [directKey]: { ...gradingInputs[directKey], marks: directScore, feedback: e.target.value },
                                              })
                                            }
                                          />
                                          <button
                                            type="button"
                                            className="save-grade-btn"
                                            style={{ background: "linear-gradient(135deg, #eab308, #d97706)", color: "#000" }}
                                            disabled={savingGradeId === directKey}
                                            onClick={() => handleDirectGradeNonSubmitted(st, assign)}
                                          >
                                            {savingGradeId === directKey ? "⏳" : "✍️ Record"}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="no-subjects" style={{ padding: "40px", textAlign: "center" }}>
                <span style={{ fontSize: "2.4rem", display: "block", marginBottom: "8px" }}>🔍</span>
                <h4 style={{ color: "#ffffff", fontSize: "1.1rem" }}>No Students Found</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {submissionsSearch
                    ? `No students matching "${submissionsSearch}". Clear the search query.`
                    : "No students registered yet. Click '+ Award Mark by Reg No' above to record marks directly."}
                </p>
                {submissionsSearch && (
                  <button type="button" className="secondary-btn" style={{ marginTop: "12px" }} onClick={() => setSubmissionsSearch("")}>
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VIEW MODE B: BY ASSIGNMENT (TASK-FOCUSED)
            ===================================================================== */}
        {submissionsViewMode === "assignment" && (
          <div>
            {currentCourseAssignments.length === 0 ? (
              <div className="no-subjects" style={{ padding: "30px", textAlign: "center" }}>
                <p>No assignments created yet for this course. Click "+ Create Task" above to add one.</p>
              </div>
            ) : (
              <div>
                {/* ASSIGNMENT CHIPS TABS */}
                <div className="assignment-tab-chips">
                  {currentCourseAssignments.map((assign, idx) => {
                    const count = customSubmissions.filter((s) => s.assignmentId === assign.id).length;
                    const isActive = selectedAssignViewId === assign.id;
                    return (
                      <button
                        key={assign.id}
                        type="button"
                        className={`assign-chip-btn ${isActive ? "active" : ""}`}
                        onClick={() => setSelectedAssignViewId(assign.id)}
                      >
                        <span>📝 Task #{idx + 1}: {assign.title}</span>
                        <span style={{ fontSize: "0.75rem", background: "rgba(255, 255, 255, 0.15)", padding: "2px 6px", borderRadius: "10px" }}>
                          {count} Submitted
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* CURRENT SELECTED ASSIGNMENT HERO */}
                {(() => {
                  const targetAssign = currentCourseAssignments.find((a) => a.id === selectedAssignViewId) || currentCourseAssignments[0];
                  if (!targetAssign) return null;

                  const submissionsForAssign = customSubmissions.filter((s) => s.assignmentId === targetAssign.id);
                  const gradedForAssign = submissionsForAssign.filter((s) => s.status === "Graded");

                  return (
                    <div>
                      <div className="assignment-focus-hero">
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "2px 8px", borderRadius: "6px" }}>
                              {targetAssign.unit}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "#fde047", fontWeight: 600 }}>
                              ⭐ Max Marks: {targetAssign.maxMarks}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              📅 Due: {targetAssign.dueDate}
                            </span>
                          </div>
                          <h3 style={{ fontSize: "1.2rem", color: "#ffffff", margin: "2px 0 6px 0" }}>
                            {targetAssign.title}
                          </h3>
                          {targetAssign.description && (
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, maxWidth: "700px" }}>
                              {targetAssign.description}
                            </p>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <div style={{ background: "rgba(0, 0, 0, 0.35)", padding: "8px 14px", borderRadius: "10px", textAlign: "center" }}>
                            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#34d399", display: "block" }}>
                              {submissionsForAssign.length} / {studentRows.length}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Submitted</span>
                          </div>
                          <div style={{ background: "rgba(0, 0, 0, 0.35)", padding: "8px 14px", borderRadius: "10px", textAlign: "center" }}>
                            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#c084fc", display: "block" }}>
                              {gradedForAssign.length} / {submissionsForAssign.length}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Graded</span>
                          </div>
                        </div>
                      </div>

                      {/* STUDENTS LIST FOR THIS SINGLE ASSIGNMENT */}
                      <div className="student-cards-list">
                        {filteredStudentRows.map((st) => {
                          const sub = st.submissions.get(targetAssign.id);
                          const isSubmitted = !!sub;
                          const isGraded = sub?.status === "Graded";
                          const subScore = gradingInputs[sub?.id]?.marks ?? (sub?.marks !== null && sub?.marks !== undefined ? sub.marks : "");
                          const subFeedback = gradingInputs[sub?.id]?.feedback ?? (sub?.feedback || "");

                          const directKey = `${st.regNo}_${targetAssign.id}`;
                          const directScore = gradingInputs[directKey]?.marks ?? "";
                          const directFeedback = gradingInputs[directKey]?.feedback ?? "Evaluated offline by faculty";

                          return (
                            <div key={st.regNo} className="student-card-item" style={{ padding: "12px 18px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div className="student-avatar" style={{ width: "36px", height: "36px", fontSize: "1.1rem" }}>👨‍🎓</div>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#ffffff" }}>{st.name}</h4>
                                    <span className="regno-badge" style={{ fontSize: "0.78rem", padding: "1px 6px" }}>🆔 {st.regNo}</span>
                                  </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
                                  {isSubmitted ? (
                                    <>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ fontSize: "0.78rem", color: isGraded ? "#c084fc" : "#fde047", fontWeight: 700, background: "rgba(255, 255, 255, 0.05)", padding: "4px 8px", borderRadius: "6px" }}>
                                          {isGraded ? `⭐ ${sub.marks}/${targetAssign.maxMarks}` : "⏳ Needs Grade"}
                                        </span>
                                        {!sub.isManual && (
                                          <button
                                            type="button"
                                            style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.4)", color: "#38bdf8", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}
                                            onClick={() => handleDownloadSubmissionFile(sub, activeCourse?.name)}
                                          >
                                            📥 PDF
                                          </button>
                                        )}
                                      </div>

                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <input
                                          type="number"
                                          min={0}
                                          max={targetAssign.maxMarks}
                                          placeholder={`0-${targetAssign.maxMarks}`}
                                          style={{ width: "75px" }}
                                          className="grade-input-box"
                                          value={subScore}
                                          onChange={(e) =>
                                            setGradingInputs({
                                              ...gradingInputs,
                                              [sub.id]: { ...gradingInputs[sub.id], marks: e.target.value, feedback: subFeedback },
                                            })
                                          }
                                        />
                                        <input
                                          type="text"
                                          placeholder="Feedback..."
                                          style={{ width: "160px" }}
                                          className="grade-input-box"
                                          value={subFeedback}
                                          onChange={(e) =>
                                            setGradingInputs({
                                              ...gradingInputs,
                                              [sub.id]: { ...gradingInputs[sub.id], marks: subScore, feedback: e.target.value },
                                            })
                                          }
                                        />
                                        <button
                                          type="button"
                                          className="save-grade-btn"
                                          disabled={savingGradeId === sub.id}
                                          onClick={() => handleSaveStudentGrade(sub.id, targetAssign.maxMarks, st.regNo)}
                                        >
                                          {savingGradeId === sub.id ? "⏳" : isGraded ? "💾 Save" : "🚀 Grade"}
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>❌ Not Submitted</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={targetAssign.maxMarks}
                                        placeholder={`0-${targetAssign.maxMarks}`}
                                        style={{ width: "75px" }}
                                        className="grade-input-box"
                                        value={directScore}
                                        onChange={(e) =>
                                          setGradingInputs({
                                            ...gradingInputs,
                                            [directKey]: { ...gradingInputs[directKey], marks: directScore, feedback: directFeedback },
                                          })
                                        }
                                      />
                                      <button
                                        type="button"
                                        className="save-grade-btn"
                                        style={{ background: "linear-gradient(135deg, #eab308, #d97706)", color: "#000" }}
                                        disabled={savingGradeId === directKey}
                                        onClick={() => handleDirectGradeNonSubmitted(st, targetAssign)}
                                      >
                                        {savingGradeId === directKey ? "⏳" : "✍️ Offline Mark"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VIEW MODE C: GRADEBOOK MATRIX SPREADSHEET
            ===================================================================== */}
        {submissionsViewMode === "gradebook" && (
          <div className="gradebook-card-container">
            <div className="gradebook-table-responsive">
              <table className="gradebook-table">
                <thead>
                  <tr>
                    <th>Reg No</th>
                    <th>Student Name</th>
                    {currentCourseAssignments.map((a, idx) => (
                      <th key={a.id} title={a.title}>
                        Task #{idx + 1} ({a.maxMarks}m)
                      </th>
                    ))}
                    <th>Total Score</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentRows.length > 0 ? (
                    filteredStudentRows.map((st) => (
                      <tr key={st.regNo}>
                        <td>
                          <span className="regno-badge" style={{ fontSize: "0.78rem", padding: "2px 6px" }}>
                            {st.regNo}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{st.name}</td>
                        {currentCourseAssignments.map((a) => {
                          const sub = st.submissions.get(a.id);
                          if (sub?.status === "Graded") {
                            return (
                              <td key={a.id}>
                                <span className="grade-badge-cell graded">
                                  ⭐ {sub.marks} / {a.maxMarks}
                                </span>
                              </td>
                            );
                          }
                          if (sub) {
                            return (
                              <td key={a.id}>
                                <span className="grade-badge-cell pending">
                                  ⏳ Pending
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td key={a.id}>
                              <span className="grade-badge-cell none">
                                —
                              </span>
                            </td>
                          );
                        })}
                        <td>
                          <strong style={{ color: "#fde047" }}>
                            {st.totalMarksAwarded} / {st.totalMaxMarks}
                          </strong>
                        </td>
                        <td>
                          {st.isCompleted && <span className="submission-count-pill complete" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>🟢 Complete</span>}
                          {st.isPartial && <span className="submission-count-pill partial" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>🟡 Partial ({st.percentage}%)</span>}
                          {st.isNone && <span className="submission-count-pill none" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>🔴 Unsubmitted</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            style={{
                              background: "rgba(56, 189, 248, 0.15)",
                              border: "1px solid rgba(56, 189, 248, 0.4)",
                              color: "#38bdf8",
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "0.76rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setSubmissionsViewMode("students");
                              setExpandedStudents(new Set([st.regNo]));
                            }}
                          >
                            👁️ Inspect & Grade
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={currentCourseAssignments.length + 5} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                        No students found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
                  <input
                    type="text"
                    className="form-control"
                    value={publishUnit}
                    onChange={(e) => setPublishUnit(e.target.value)}
                    placeholder="e.g. Unit 1"
                    style={{ background: "rgba(17,24,39,0.9)", color: "#fff", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.9rem" }}
                    required
                  />
                </div>
              </div>

              {/* Note Category */}
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
                  <option value="PDF Document">📂 PDF Document / Reference Resource</option>
                </select>
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

      {/* MANUAL GRADE MODAL (FOR STUDENTS WHO HAVEN'T SUBMITTED ONLINE) */}
      {showManualGradeModal && (
        <div className="note-modal-backdrop" onClick={() => !isSubmittingManualGrade && setShowManualGradeModal(false)}>
          <div
            className="note-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85)",
            }}
          >
            <button
              className="modal-close-btn"
              onClick={() => !isSubmittingManualGrade && setShowManualGradeModal(false)}
              disabled={isSubmittingManualGrade}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <span style={{ fontSize: "2.4rem" }}>✍️📊</span>
              <div>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.45rem", margin: 0, color: "#ffffff" }}>
                  Record Marks by Register Number
                </h2>
                <span style={{ color: "var(--accent-cyan)", fontSize: "0.85rem" }}>
                  Award marks and feedback for students who did not submit online or submitted hard copy offline.
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveManualModalGrade} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Course & Assignment */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                    Select Course *
                  </label>
                  <select
                    className="form-control"
                    value={manualGradeData.subjectId || activeCourse?.id || ""}
                    onChange={(e) => {
                      const newSubId = e.target.value;
                      const assignsForSub = customAssignments.filter((a) => a.subjectId === newSubId);
                      setManualGradeData({
                        ...manualGradeData,
                        subjectId: newSubId,
                        assignmentId: assignsForSub[0]?.id || "",
                      });
                    }}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.88rem" }}
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
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                    Select Assignment Task *
                  </label>
                  <select
                    className="form-control"
                    value={manualGradeData.assignmentId}
                    onChange={(e) => setManualGradeData({ ...manualGradeData, assignmentId: e.target.value })}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.88rem" }}
                    required
                  >
                    {currentCourseAssignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.unit} • Max: {a.maxMarks})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Register Number & Student Name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label style={{ display: "block", color: "var(--accent-cyan)", fontSize: "0.85rem", fontWeight: 700, marginBottom: "5px" }}>
                    Student Register Number / ID *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Register Number (e.g. 2026ECE01)"
                    value={manualGradeData.regNo}
                    onChange={(e) => {
                      const typedReg = e.target.value;
                      const matched = (users || []).find((u) => (u.identifier || "").toLowerCase() === typedReg.trim().toLowerCase());
                      setManualGradeData({
                        ...manualGradeData,
                        regNo: typedReg,
                        studentName: matched ? matched.name : manualGradeData.studentName,
                      });
                    }}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#38bdf8", fontWeight: 700, padding: "10px", borderRadius: "8px", border: "1px solid rgba(56,189,248,0.4)", width: "100%", fontSize: "0.92rem" }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                    Student Name (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Karthik R"
                    value={manualGradeData.studentName}
                    onChange={(e) => setManualGradeData({ ...manualGradeData, studentName: e.target.value })}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.88rem" }}
                  />
                </div>
              </div>

              {/* QUICK REGISTER SUGGESTIONS FROM CLASS */}
              {studentRows.length > 0 && (
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Quick-pick from enrolled student Register IDs:
                  </span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", maxHeight: "80px", overflowY: "auto" }}>
                    {studentRows.slice(0, 8).map((st) => (
                      <button
                        key={st.regNo}
                        type="button"
                        onClick={() => setManualGradeData({ ...manualGradeData, regNo: st.regNo, studentName: st.name })}
                        style={{
                          background: manualGradeData.regNo === st.regNo ? "rgba(56, 189, 248, 0.3)" : "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "#ffffff",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        {st.regNo} ({st.name.split(" ")[0]})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Awarded Marks & Feedback */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label style={{ display: "block", color: "#fde047", fontSize: "0.85rem", fontWeight: 700, marginBottom: "5px" }}>
                    Award Marks *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={customAssignments.find((a) => a.id === manualGradeData.assignmentId)?.maxMarks || 20}
                    placeholder="e.g. 18"
                    value={manualGradeData.marks}
                    onChange={(e) => setManualGradeData({ ...manualGradeData, marks: e.target.value })}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#fde047", fontWeight: 800, padding: "10px", borderRadius: "8px", border: "1px solid rgba(234,179,8,0.4)", width: "100%", fontSize: "0.95rem" }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                    Evaluation Remarks / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Evaluated physical paper in laboratory / Viva voce"
                    value={manualGradeData.feedback}
                    onChange={(e) => setManualGradeData({ ...manualGradeData, feedback: e.target.value })}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.88rem" }}
                  />
                </div>
              </div>

              {/* INFO BANNER */}
              <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.2rem" }}>ℹ️</span>
                <span style={{ fontSize: "0.8rem", color: "#bae6fd" }}>
                  Recording this mark adds the student's Register Number to the course submissions table as <strong>Graded (Offline / Manual)</strong>, and updates their submission count accordingly.
                </span>
              </div>

              {/* BUTTONS */}
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSubmittingManualGrade}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #10b981, #06b6d4)",
                    padding: "12px",
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    opacity: isSubmittingManualGrade ? 0.7 : 1,
                  }}
                >
                  {isSubmittingManualGrade ? "⏳ Saving Mark..." : "🚀 Save & Record Student Mark"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmittingManualGrade}
                  onClick={() => setShowManualGradeModal(false)}
                  style={{ padding: "12px 18px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREATE ASSIGNMENT MODAL */}
      {showQuickAssignModal && (
        <div className="note-modal-backdrop" onClick={() => !isCreatingQuickAssign && setShowQuickAssignModal(false)}>
          <div
            className="note-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "580px",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85)",
            }}
          >
            <button
              className="modal-close-btn"
              onClick={() => !isCreatingQuickAssign && setShowQuickAssignModal(false)}
              disabled={isCreatingQuickAssign}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <span style={{ fontSize: "2.4rem" }}>📝⚡</span>
              <div>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.45rem", margin: 0, color: "#ffffff" }}>
                  Create Course Assignment
                </h2>
                <span style={{ color: "var(--accent-purple-light)", fontSize: "0.85rem" }}>
                  Post an assignment task for enrolled students to submit in their dashboard.
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateQuickAssignment} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                    Select Course *
                  </label>
                  <select
                    className="form-control"
                    value={quickAssignData.subjectId || activeCourse?.id || ""}
                    onChange={(e) => setQuickAssignData({ ...quickAssignData, subjectId: e.target.value })}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.88rem" }}
                    required
                  >
                    {availableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                    Unit / Module *
                  </label>
                  <select
                    className="form-control"
                    value={quickAssignData.unit}
                    onChange={(e) => setQuickAssignData({ ...quickAssignData, unit: e.target.value })}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.88rem" }}
                  >
                    <option value="Unit 1">Unit 1</option>
                    <option value="Unit 2">Unit 2</option>
                    <option value="Unit 3">Unit 3</option>
                    <option value="Unit 4">Unit 4</option>
                    <option value="Unit 5">Unit 5</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                  Assignment Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assignment 3: Antenna Array Radiation Pattern"
                  value={quickAssignData.title}
                  onChange={(e) => setQuickAssignData({ ...quickAssignData, title: e.target.value })}
                  style={{ background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.9rem" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                    Due Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nov 15, 2026"
                    value={quickAssignData.dueDate}
                    onChange={(e) => setQuickAssignData({ ...quickAssignData, dueDate: e.target.value })}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.88rem" }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                    Max Marks *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quickAssignData.maxMarks}
                    onChange={(e) => setQuickAssignData({ ...quickAssignData, maxMarks: e.target.value })}
                    style={{ background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", fontSize: "0.88rem" }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "5px" }}>
                  Instructions / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Instructions for students regarding solving problems, formatting, and submission rules..."
                  value={quickAssignData.desc}
                  onChange={(e) => setQuickAssignData({ ...quickAssignData, desc: e.target.value })}
                  style={{ width: "100%", background: "rgba(17,24,39,0.95)", color: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", fontSize: "0.88rem", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isCreatingQuickAssign}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #9333ea, #06b6d4)",
                    padding: "12px",
                    fontSize: "0.92rem",
                    fontWeight: 700,
                  }}
                >
                  {isCreatingQuickAssign ? "⏳ Publishing..." : "🚀 Publish Assignment"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isCreatingQuickAssign}
                  onClick={() => setShowQuickAssignModal(false)}
                  style={{ padding: "12px 18px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="submission-toast">
          <span style={{ fontSize: "1.2rem" }}>🎉</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
