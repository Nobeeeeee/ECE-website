import { db, storage } from "../firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ==========================================
// 1. NOTES & RESOURCES FIRESTORE SERVICE
// ==========================================
export const subscribeNotes = (subjectId, callback) => {
  try {
    const q = query(
      collection(db, "notes"),
      where("subjectId", "==", subjectId)
    );
    return onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(notes);
    }, (error) => {
      console.warn("Firestore notes subscription warning:", error.message);
      callback([]);
    });
  } catch (err) {
    console.warn("Firestore notes init error:", err.message);
    return () => {};
  }
};

export const subscribeAllNotes = (callback) => {
  try {
    const q = collection(db, "notes");
    return onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(notes);
    }, (error) => {
      console.warn("Firestore all notes subscription warning:", error.message);
      callback([]);
    });
  } catch (err) {
    console.warn("Firestore all notes init error:", err.message);
    return () => {};
  }
};

export const saveNoteToFirestore = async (noteData) => {
  try {
    const docId = noteData.id || `custom_note_${Date.now()}`;
    const noteRef = doc(db, "notes", docId);
    await setDoc(noteRef, {
      ...noteData,
      id: docId,
      createdAt: serverTimestamp(),
      publishedAt: new Date().toISOString(),
    }, { merge: true });
    return docId;
  } catch (err) {
    console.error("Failed to save note to Firestore:", err);
    throw err;
  }
};

export const addNoteToFirestore = async (noteData) => {
  return await saveNoteToFirestore(noteData);
};

export const updateNoteInFirestore = async (noteId, updatedData) => {
  try {
    const noteRef = doc(db, "notes", noteId);
    await updateDoc(noteRef, updatedData);
  } catch (err) {
    console.error("Failed to update note in Firestore:", err);
    throw err;
  }
};

export const deleteNoteFromFirestore = async (noteId) => {
  try {
    await deleteDoc(doc(db, "notes", noteId));
  } catch (err) {
    console.error("Failed to delete note from Firestore:", err);
    throw err;
  }
};

export const subscribeAllFiles = (callback) => {
  try {
    const q = collection(db, "files");
    return onSnapshot(q, (snapshot) => {
      const files = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(files);
    }, (error) => {
      console.warn("Firestore all files subscription warning:", error.message);
      callback([]);
    });
  } catch (err) {
    console.warn("Firestore all files init error:", err.message);
    return () => {};
  }
};

export const saveFileToFirestore = async (fileData) => {
  try {
    const docId = fileData.id || `custom_file_${Date.now()}`;
    const fileRef = doc(db, "files", docId);
    await setDoc(fileRef, {
      ...fileData,
      id: docId,
      createdAt: serverTimestamp(),
      uploadedAt: new Date().toISOString(),
    }, { merge: true });
    return docId;
  } catch (err) {
    console.error("Failed to save file to Firestore:", err);
    throw err;
  }
};

export const deleteFileFromFirestore = async (fileId) => {
  try {
    await deleteDoc(doc(db, "files", fileId));
  } catch (err) {
    try {
      await deleteDoc(doc(db, "notes", fileId));
    } catch (e) {
      console.error("Failed to delete file from Firestore:", err);
      throw err;
    }
  }
};

// ==========================================
// 2. ASSIGNMENTS FIRESTORE SERVICE (Faculty)
// ==========================================
export const subscribeAllAssignments = (callback) => {
  try {
    const q = collection(db, "assignments");
    return onSnapshot(q, (snapshot) => {
      const assigns = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      callback(assigns);
    }, (error) => {
      console.warn("Firestore all assignments subscription warning:", error.message);
      callback([]);
    });
  } catch (err) {
    console.warn("Firestore all assignments init error:", err.message);
    return () => {};
  }
};

export const subscribeAssignments = (subjectId, callback) => {
  try {
    const q = query(
      collection(db, "assignments"),
      where("subjectId", "==", subjectId)
    );
    return onSnapshot(q, (snapshot) => {
      const assigns = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      callback(assigns);
    }, (error) => {
      console.warn("Firestore assignments subscription warning:", error.message);
      callback([]);
    });
  } catch (err) {
    console.warn("Firestore assignments init error:", err.message);
    return () => {};
  }
};

export const createAssignmentInFirestore = async (assignmentData) => {
  try {
    const docId = assignmentData.id || `assignment_${Date.now()}`;
    const assignRef = doc(db, "assignments", docId);
    await setDoc(assignRef, {
      ...assignmentData,
      id: docId,
      createdAt: serverTimestamp(),
    }, { merge: true });
    return docId;
  } catch (err) {
    console.error("Failed to create assignment in Firestore:", err);
    throw err;
  }
};

export const deleteAssignmentFromFirestore = async (assignmentId) => {
  try {
    await deleteDoc(doc(db, "assignments", assignmentId));
  } catch (err) {
    console.error("Failed to delete assignment from Firestore:", err);
    throw err;
  }
};

// ==========================================
// 3. STUDENT SUBMISSIONS FIRESTORE SERVICE
// ==========================================
export const subscribeSubmissions = (subjectId, callback) => {
  try {
    const q = query(
      collection(db, "submissions"),
      where("subjectId", "==", subjectId)
    );
    return onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(subs);
    }, (error) => {
      console.warn("Firestore submissions subscription warning:", error.message);
      callback([]);
    });
  } catch (err) {
    console.warn("Firestore submissions init error:", err.message);
    return () => {};
  }
};

export const subscribeAllSubmissions = (callback) => {
  try {
    const q = collection(db, "submissions");
    return onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(subs);
    }, (error) => {
      console.warn("Firestore all submissions subscription warning:", error.message);
      callback([]);
    });
  } catch (err) {
    console.warn("Firestore all submissions init error:", err.message);
    return () => {};
  }
};

export const submitStudentAssignmentToFirestore = async (submissionData, fileObj = null) => {
  try {
    let fileUrl = "";
    if (fileObj) {
      try {
        const storageRef = ref(storage, `submissions/${Date.now()}_${fileObj.name}`);
        const uploadResult = await uploadBytes(storageRef, fileObj);
        fileUrl = await getDownloadURL(uploadResult.ref);
      } catch (storageErr) {
        console.warn("Firebase Storage upload warning, using mock/blob URL:", storageErr.message);
        fileUrl = URL.createObjectURL(fileObj);
      }
    }

    const docId = submissionData.id || `submission_${Date.now()}`;
    const subRef = doc(db, "submissions", docId);
    await setDoc(subRef, {
      ...submissionData,
      id: docId,
      fileUrl: fileUrl || submissionData.fileUrl || "",
      submittedAt: submissionData.submittedAt || new Date().toISOString(),
      status: submissionData.status || "Submitted",
    }, { merge: true });
    return docId;
  } catch (err) {
    console.error("Failed to submit assignment to Firestore:", err);
    throw err;
  }
};

export const gradeStudentSubmissionInFirestore = async (submissionId, gradeData) => {
  try {
    const subRef = doc(db, "submissions", submissionId);
    await setDoc(subRef, {
      marks: gradeData.marks,
      feedback: gradeData.feedback || "",
      status: "Graded",
      gradedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error("Failed to grade submission in Firestore:", err);
    throw err;
  }
};

export const saveManualStudentGradeToFirestore = async (submissionData) => {
  try {
    const docId = submissionData.id || `sub_manual_${Date.now()}`;
    const subRef = doc(db, "submissions", docId);
    await setDoc(subRef, {
      ...submissionData,
      id: docId,
      status: "Graded",
      isManual: true,
      gradedAt: new Date().toISOString(),
      submittedAt: submissionData.submittedAt || new Date().toISOString(),
    }, { merge: true });
    return docId;
  } catch (err) {
    console.error("Failed to save manual student grade to Firestore:", err);
    throw err;
  }
};

// ==========================================
// 4. USERS & FACULTY HIERARCHY MANAGEMENT (Admin ➔ Faculty ➔ Student)
// ==========================================
export const getAllUsersFromFirestore = async () => {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Failed to fetch users from Firestore:", err.message);
    return [];
  }
};

export const updateUserRoleInFirestore = async (userId, roleData) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, roleData);
  } catch (err) {
    console.error("Failed to update user role in Firestore:", err);
    throw err;
  }
};

// ==========================================
// 5. SUBJECTS & FACULTY REAL-TIME FIRESTORE SERVICE
// ==========================================
export const ensureSubjectSystemSentinel = async () => {
  try {
    await setDoc(doc(db, "subjects", "_config"), { isSystem: true, initialized: true }, { merge: true });
  } catch (err) {
    console.warn("Sentinel check error:", err.message);
  }
};

export const subscribeSubjects = (callback) => {
  try {
    const q = collection(db, "subjects");
    return onSnapshot(q, (snapshot) => {
      const rawList = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => !d.id.startsWith("_") && !d.isSystem && !/^sub_[1-9]$/.test(d.id));

      const seenIds = new Set();
      const seenKeys = new Set();
      const uniqueList = [];
      const duplicateIdsToDelete = [];

      for (const item of rawList) {
        if (!item || !item.id) continue;
        const normCode = (item.code || "").trim().toLowerCase();
        const normName = (item.name || "").trim().toLowerCase();
        const key = normCode || normName;

        if (seenIds.has(item.id)) {
          duplicateIdsToDelete.push(item.id);
          continue;
        }

        if (key && seenKeys.has(key)) {
          duplicateIdsToDelete.push(item.id);
          continue;
        }

        seenIds.add(item.id);
        if (key) seenKeys.add(key);
        uniqueList.push(item);
      }

      // Purge redundant duplicate documents from Firestore in the background
      if (duplicateIdsToDelete.length > 0) {
        duplicateIdsToDelete.forEach(async (dupId) => {
          try {
            await deleteDoc(doc(db, "subjects", dupId));
          } catch (e) {
            console.warn("Auto cleanup of duplicate subject doc failed:", dupId, e.message);
          }
        });
      }

      callback(uniqueList);
    }, (error) => {
      console.warn("Firestore subjects subscription warning:", error.message);
      callback([]);
    });
  } catch (err) {
    console.warn("Firestore subjects init error:", err.message);
    return () => {};
  }
};

export const subscribeUsers = (callback) => {
  try {
    const q = collection(db, "users");
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(list);
    }, (error) => {
      console.warn("Firestore users subscription warning:", error.message);
      callback([]);
    });
  } catch (err) {
    console.warn("Firestore users init error:", err.message);
    return () => {};
  }
};

export const saveSubjectToFirestore = async (subjectData) => {
  try {
    if (subjectData.id && /^sub_[1-9]$/.test(subjectData.id)) {
      console.warn("Blocked legacy dummy subject from saving:", subjectData.id);
      return subjectData.id;
    }
    await ensureSubjectSystemSentinel();

    // Use deterministic slug-based ID so rapid multiple saves or retries target the same document
    let docId = subjectData.id;
    if (!docId || (docId.startsWith("sub_") && /^\d+$/.test(docId.replace("sub_", "")))) {
      const cleanSlug = (subjectData.code || subjectData.name || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      if (cleanSlug) {
        docId = `sub_${cleanSlug}`;
      } else {
        docId = subjectData.id || `sub_${Date.now()}`;
      }
    }

    const subjectRef = doc(db, "subjects", docId);
    await setDoc(subjectRef, {
      ...subjectData,
      id: docId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return docId;
  } catch (err) {
    console.error("Failed to save subject to Firestore:", err);
    throw err;
  }
};

export const deleteSubjectFromFirestore = async (subjectId) => {
  try {
    if (subjectId.startsWith("_")) return;
    await deleteDoc(doc(db, "subjects", subjectId));
    await ensureSubjectSystemSentinel();
  } catch (err) {
    console.error("Failed to delete subject from Firestore:", err);
    throw err;
  }
};

export const createOrUpdateFacultyInFirestore = async ({ name, subjectCode, subjectName, password }) => {
  try {
    const cleanName = name.trim();
    const docId = `faculty_${cleanName.toLowerCase().replace(/\s+/g, "_")}`;
    const userRef = doc(db, "users", docId);
    
    await setDoc(userRef, {
      uid: docId,
      name: cleanName,
      role: "faculty",
      subjectCode: subjectCode || "",
      subjectName: subjectName || "",
      identifier: cleanName,
      facultyPassword: password || "faculty123",
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return docId;
  } catch (err) {
    console.error("Failed to create/update faculty in Firestore:", err);
  }
};
