import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminPage from "./pages/AdminPage";

function HomeRoleRedirect() {
  const { currentUser } = useAuth();
  if (currentUser?.role === "admin") {
    return <Navigate to="/admin" replace />;
  } else if (currentUser?.role === "faculty") {
    return <Navigate to="/faculty" replace />;
  } else {
    return <StudentDashboard />;
  }
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRoleRedirect />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/faculty" element={<FacultyDashboard />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/Admin" element={<Navigate to="/admin" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;