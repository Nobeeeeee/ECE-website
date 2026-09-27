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

export const addNoteToFirestore = async (noteData) => {
  try {
    const docRef = await addDoc(collection(db, "notes"), {
      ...noteData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error("Failed to add note to Firestore:", err);
    throw err;
  }
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

export const deleteFileFromFirestore = async (fileId) => {
  try {
    await deleteDoc(doc(db, "notes", fileId));
  } catch (err) {
    console.error("Failed to delete file from Firestore:", err);
    throw err;
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

    const docRef = await addDoc(collection(db, "submissions"), {
      ...submissionData,
      fileUrl: fileUrl || submissionData.fileUrl || "",
      submittedAt: new Date().toISOString(),
      status: submissionData.status || "Submitted",
    });
    return docRef.id;
  } catch (err) {
    console.error("Failed to submit assignment to Firestore:", err);
    throw err;
  }
};

export const gradeStudentSubmissionInFirestore = async (submissionId, gradeData) => {
  try {
    const subRef = doc(db, "submissions", submissionId);
    await updateDoc(subRef, {
      marks: gradeData.marks,
      feedback: gradeData.feedback || "",
      status: "Graded",
      gradedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to grade submission in Firestore:", err);
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
export const subscribeSubjects = (callback) => {
  try {
    const q = collection(db, "subjects");
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(list);
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
    const docId = subjectData.id || `sub_${Date.now()}`;
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
    await deleteDoc(doc(db, "subjects", subjectId));
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
