import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import StudentAuth from "@/pages/StudentAuth";
import AuthVisualFix from "@/components/AuthVisualFix";
import LockerSubtestFix from "@/components/LockerSubtestFix";
import MentorContentFix from "@/components/MentorContentFix";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<AuthVisualFix><Home /></AuthVisualFix>} />
        <Route path="/akun" element={<StudentAuth />} />
        <Route path="/login" element={<StudentAuth />} />
      </Routes>
      <LockerSubtestFix />
      <MentorContentFix />
      <Toaster richColors position="top-right" />
    </>
  );
}
