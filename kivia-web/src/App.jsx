import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DoctorApp from "./pages/DoctorApp";
import PatientApp from "./pages/PatientApp";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/doctor" element={<DoctorApp />} />
        <Route path="/patient" element={<PatientApp />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}