import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { adminDb } from "./firebaseAdmin.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    service: "ECE StudyNotes Hub Backend Service",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 1. NOTES & RESOURCES ENDPOINTS
// ==========================================
app.get("/api/notes/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const snapshot = await adminDb
      .collection("notes")
      .where("subjectId", "==", subjectId)
      .get();
    
    const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, count: notes.length, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const noteData = req.body;
    const docRef = await adminDb.collection("notes").add({
      ...noteData,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ success: true, id: docRef.id, message: "Note created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. ASSIGNMENTS ENDPOINTS
// ==========================================
app.get("/api/assignments/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const snapshot = await adminDb
      .collection("assignments")
      .where("subjectId", "==", subjectId)
      .get();
    
    const assignments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/assignments", async (req, res) => {
  try {
    const assignmentData = req.body;
    const docRef = await adminDb.collection("assignments").add({
      ...assignmentData,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ success: true, id: docRef.id, message: "Assignment created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 3. STUDENT SUBMISSIONS ENDPOINTS
// ==========================================
app.get("/api/submissions/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const snapshot = await adminDb
      .collection("submissions")
      .where("subjectId", "==", subjectId)
      .get();
    
    const submissions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/submissions", async (req, res) => {
  try {
    const submissionData = req.body;
    const docRef = await adminDb.collection("submissions").add({
      ...submissionData,
      submittedAt: new Date().toISOString(),
      status: submissionData.status || "Submitted",
    });
    res.status(201).json({ success: true, id: docRef.id, message: "Student assignment submitted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/submissions/:id/grade", async (req, res) => {
  try {
    const { id } = req.params;
    const { marks, feedback } = req.body;

    await adminDb.collection("submissions").doc(id).update({
      marks: marks,
      feedback: feedback || "",
      status: "Graded",
      gradedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: "Submission graded successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ECE Backend Express Server running on http://localhost:${PORT}`);
});
