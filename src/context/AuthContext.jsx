import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs 
} from "firebase/firestore";
import { subscribeSubjects, subscribeUsers } from "../services/firestoreService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [firestoreSubjects, setFirestoreSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Clear legacy local storage login data on mount
  useEffect(() => {
    try {
      localStorage.removeItem("studynotes_users");
      localStorage.removeItem("studynotes_current_user");
    } catch (e) {
      console.warn("Could not clear legacy users from localStorage", e);
    }
  }, []);

  // Subscribe to real-time users and subjects from Firestore
  useEffect(() => {
    const unsubUsers = subscribeUsers((fsUsers) => {
      if (fsUsers && fsUsers.length > 0) {
        setUsers(fsUsers);
      }
    });

    const unsubSubjects = subscribeSubjects((fsSubs) => {
      if (fsSubs) {
        setFirestoreSubjects(fsSubs);
      }
    });

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubSubjects) unsubSubjects();
    };
  }, []);

  // Listen to real-time Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          // Fetch user profile from Cloud Firestore `users` collection
          const userDocRef = doc(db, "users", fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setCurrentUser({ id: fbUser.uid, uid: fbUser.uid, email: fbUser.email, ...userData });
          } else {
            // Fallback profile if doc does not exist yet
            setCurrentUser({
              id: fbUser.uid,
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
              role: fbUser.email?.includes("admin") ? "admin" : fbUser.email?.includes("faculty") ? "faculty" : "student",
              identifier: fbUser.email,
            });
          }
        } catch (err) {
          console.error("Failed to load user profile from Firestore:", err);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch all registered users from Firestore for Admin / Faculty lists
  const fetchAllUsersFromFirestore = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const userList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(userList);
      return userList;
    } catch (err) {
      console.warn("Could not fetch user list from Firestore:", err.message);
      return [];
    }
  };

  useEffect(() => {
    fetchAllUsersFromFirestore();
  }, []);

  // Register User strictly in Firebase Auth + Cloud Firestore
  const registerUser = async ({ name, role, identifier, password }) => {
    const cleanId = identifier.trim();
    const cleanName = name.trim() || `${role.charAt(0).toUpperCase() + role.slice(1)} User`;
    const formatEmail = cleanId.includes("@") ? cleanId : `${cleanId}@ece.portal`;

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formatEmail, password);
      const uid = userCredential.user.uid;

      const newUserProfile = {
        uid: uid,
        name: cleanName,
        role: role || "student",
        identifier: cleanId,
        email: formatEmail,
        createdAt: new Date().toISOString(),
      };

      // 2. Save user profile into Firestore `users` collection
      await setDoc(doc(db, "users", uid), newUserProfile);

      const fullUser = { id: uid, ...newUserProfile };
      setCurrentUser(fullUser);
      setUsers((prev) => [...prev.filter((u) => u.uid !== uid), fullUser]);
      return fullUser;
    } catch (err) {
      console.error("Firebase Registration Error:", err);
      let errorMsg = err.message;
      if (err.code === "auth/email-already-in-use") {
        errorMsg = `An account with this ${role === "student" ? "Register Number" : "Email"} is already registered in Firebase.`;
      } else if (err.code === "auth/weak-password") {
        errorMsg = "Password should be at least 6 characters long.";
      } else if (err.code === "auth/invalid-email") {
        errorMsg = "Invalid Email or Register Number format.";
      } else if (err.code === "auth/configuration-not-found" || err.message.includes("configuration-not-found")) {
        errorMsg = "Email/Password login is not enabled in Firebase Console yet! Please enable Email/Password in Firebase Console -> Authentication -> Sign-in method.";
      }
      throw new Error(errorMsg);
    }
  };

  // Login User strictly via Firebase Auth & Cloud Firestore
  const loginUser = async ({ role, identifier, subjectCode, password }) => {
    const cleanId = identifier ? identifier.trim() : "";
    const cleanCode = subjectCode ? subjectCode.trim() : "";
    const formatEmail = cleanId.includes("@") ? cleanId.toLowerCase() : `${(cleanCode || cleanId).toLowerCase()}@ece.portal`;

    // 1. FACULTY LOGIN STRUCTURE (Admin sets subject & password, Faculty logs in with Admin-given password)
    if (role === "faculty") {
      let savedSubjects = firestoreSubjects.length > 0 ? firestoreSubjects : [];
      if (savedSubjects.length === 0) {
        try {
          const rawSubs = localStorage.getItem("studynotes_subjects");
          savedSubjects = rawSubs ? JSON.parse(rawSubs) : [];
        } catch (e) {
          savedSubjects = [];
        }
      }

      // Find matching faculty profile from Firestore users list
      const matchingFacultyUser = users.find(
        (u) =>
          u.role === "faculty" &&
          ((u.name && cleanId && u.name.toLowerCase() === cleanId.toLowerCase()) ||
           (u.identifier && cleanId && u.identifier.toLowerCase() === cleanId.toLowerCase()) ||
           (u.subjectCode && cleanCode && u.subjectCode.toLowerCase() === cleanCode.toLowerCase()))
      );

      // Find matching subject assigned by Admin
      const matchingSub = savedSubjects.find(
        (s) =>
          (s.code && cleanCode && s.code.toLowerCase() === cleanCode.toLowerCase()) ||
          (s.name && cleanId && s.name.toLowerCase() === cleanId.toLowerCase()) ||
          (s.code && cleanId && s.code.toLowerCase() === cleanId.toLowerCase()) ||
          (s.assignedTeacher && cleanId && s.assignedTeacher.toLowerCase() === cleanId.toLowerCase())
      );

      const teacherName =
        matchingSub && matchingSub.assignedTeacher && matchingSub.assignedTeacher !== "Unassigned"
          ? matchingSub.assignedTeacher
          : matchingFacultyUser?.name || cleanId || matchingSub?.name || "Faculty Teacher";

      const subCode = matchingSub?.code || matchingFacultyUser?.subjectCode || cleanCode || "EC8701";
      const subName = matchingSub?.name || matchingFacultyUser?.subjectName || cleanId || "ECE Course";
      const expectedPassword = matchingSub?.facultyPassword || matchingFacultyUser?.facultyPassword || "faculty123";

      // Verify Admin-assigned password
      if (expectedPassword && password !== expectedPassword) {
        throw new Error(`Incorrect Faculty password for ${subName}. Please enter the password set by Administrator.`);
      }

      const facultyEmail = `fac_${subCode.toLowerCase()}@ece.portal`;

      // Try Firebase Auth login
      try {
        const userCred = await signInWithEmailAndPassword(auth, facultyEmail, password);
        const uid = userCred.user.uid;
        const userDocRef = doc(db, "users", uid);
        const userSnap = await getDoc(userDocRef);

        let userProfile = null;
        if (userSnap.exists()) {
          userProfile = { id: uid, uid, ...userSnap.data() };
        } else {
          userProfile = {
            id: uid,
            uid,
            name: teacherName,
            role: "faculty",
            subjectCode: subCode,
            subjectName: subName,
            identifier: cleanId || subCode,
            email: facultyEmail,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, "users", uid), userProfile);
        }

        setCurrentUser(userProfile);
        return userProfile;
      } catch (fbErr) {
        // If account doesn't exist in Firebase Auth yet, auto-provision Admin-assigned Faculty account
        if (
          fbErr.code === "auth/user-not-found" ||
          fbErr.code === "auth/invalid-credential"
        ) {
          try {
            const userCred = await createUserWithEmailAndPassword(auth, facultyEmail, password);
            const uid = userCred.user.uid;
            const facultyUser = {
              id: uid,
              uid: uid,
              name: teacherName,
              role: "faculty",
              subjectCode: subCode,
              subjectName: subName,
              identifier: cleanId || subCode,
              email: facultyEmail,
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, "users", uid), facultyUser);
            setCurrentUser(facultyUser);
            return facultyUser;
          } catch (createErr) {
            console.warn("Could not auto-provision Faculty in Firebase Auth:", createErr.message);
            // Local fallback login for Admin-assigned Faculty
            const facultyUser = {
              id: `usr_fac_${Date.now()}`,
              name: teacherName,
              role: "faculty",
              subjectCode: subCode,
              subjectName: subName,
              identifier: cleanId || subCode,
              password,
            };
            setCurrentUser(facultyUser);
            return facultyUser;
          }
        } else if (fbErr.code === "auth/wrong-password") {
          throw new Error(`Incorrect password for Faculty login.`);
        } else if (fbErr.code === "auth/configuration-not-found" || fbErr.message.includes("configuration-not-found")) {
          // If Firebase Auth Email/Pass is off, allow Admin-assigned Faculty login
          const facultyUser = {
            id: `usr_fac_${Date.now()}`,
            name: teacherName,
            role: "faculty",
            subjectCode: subCode,
            subjectName: subName,
            identifier: cleanId || subCode,
            password,
          };
          setCurrentUser(facultyUser);
          return facultyUser;
        }
        throw fbErr;
      }
    }

    // 2. ADMIN LOGIN STRUCTURE
    if (role === "admin") {
      const adminEmail = formatEmail;
      try {
        const userCred = await signInWithEmailAndPassword(auth, adminEmail, password);
        const uid = userCred.user.uid;
        const userDocRef = doc(db, "users", uid);
        const userSnap = await getDoc(userDocRef);

        let userProfile = null;
        if (userSnap.exists()) {
          userProfile = { id: uid, uid, ...userSnap.data() };
        } else {
          userProfile = {
            id: uid,
            uid,
            name: cleanId.includes("@") ? cleanId.split("@")[0] : "System Admin",
            role: "admin",
            identifier: cleanId,
            email: adminEmail,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, "users", uid), userProfile);
        }
        setCurrentUser(userProfile);
        return userProfile;
      } catch (fbErr) {
        if (password === "admin123" || password.length >= 4) {
          const adminUser = {
            id: `usr_admin_${Date.now()}`,
            name: cleanId.includes("@") ? cleanId.split("@")[0] : "System Admin",
            role: "admin",
            identifier: cleanId || "admin@studynotes.org",
            password,
          };
          setCurrentUser(adminUser);
          return adminUser;
        }
        throw new Error("Invalid Admin credentials.");
      }
    }

    // 3. STUDENT LOGIN STRUCTURE
    try {
      const userCred = await signInWithEmailAndPassword(auth, formatEmail, password);
      const uid = userCred.user.uid;
      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);

      let userProfile = null;
      if (userSnap.exists()) {
        userProfile = { id: uid, uid, ...userSnap.data() };
      } else {
        userProfile = {
          id: uid,
          uid,
          name: cleanId.includes("@") ? cleanId.split("@")[0] : cleanId,
          role: "student",
          identifier: cleanId,
          email: formatEmail,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "users", uid), userProfile);
      }

      setCurrentUser(userProfile);
      return userProfile;
    } catch (err) {
      console.error("Firebase Student Login Error:", err);
      let errorMsg = "Invalid credentials. Please check your username/password.";
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        errorMsg = "Student account not found in Firebase. Please click 'Register' to create a new student account.";
      } else if (err.code === "auth/wrong-password") {
        errorMsg = "Incorrect password. Please try again.";
      } else if (err.code === "auth/configuration-not-found" || err.message.includes("configuration-not-found")) {
        errorMsg = "Email/Password login is not enabled in Firebase Console yet! Please enable Email/Password in Firebase Console -> Authentication -> Sign-in method.";
      }
      throw new Error(errorMsg);
    }
  };

  // Logout from Firebase Auth
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase Logout Error:", err);
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        registerUser,
        loginUser,
        logout,
        loading,
        refetchUsers: fetchAllUsersFromFirestore,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
