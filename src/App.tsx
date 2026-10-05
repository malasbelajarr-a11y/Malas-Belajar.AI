import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import StudentAuth from "@/pages/StudentAuth";
import MentorControlV2 from "@/pages/MentorControlV2";
import AuthVisualFix from "@/components/AuthVisualFix";
import MentorDashboardPlus from "@/components/MentorDashboardPlus";
import MentorContentManager from "@/components/MentorContentManager";
import StudentEntryGate from "@/components/StudentEntryGate";
import { Toaster } from "sonner";

export default function App() {
  const mentorControl = window.location.pathname === "/mentor-control";
  return (
    <>
      <Routes>
        <Route path="/" element={<AuthVisualFix><Home /></AuthVisualFix>} />
        <Route path="/akun" element={<StudentAuth />} />
        <Route path="/login" element={<StudentAuth />} />
        <Route path="/mentor-control" element={<MentorControlV2 />} />
      </Routes>
      {!mentorControl && <StudentEntryGate />}
      <MentorDashboardPlus />
      <MentorContentManager />
      <Toaster richColors position="top-right" />
    </>
  );
}
