import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import StudentAuth from "@/pages/StudentAuth";
import AuthVisualFix from "@/components/AuthVisualFix";
import LockerSubtestFix from "@/components/LockerSubtestFix";
import HideOldMentorFix from "@/components/HideOldMentorFix";
import WacawaciUploadFix from "@/components/WacawaciUploadFix";
import MentorContentManagerFix from "@/components/MentorContentManagerFix";
import StudentEntryGate from "@/components/StudentEntryGate";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <Routes>
        {/* Home tetap utuh supaya portal dan akses mentor asli tidak hilang. */}
        <Route path="/" element={<AuthVisualFix><Home /></AuthVisualFix>} />
        <Route path="/akun" element={<StudentAuth />} />
        <Route path="/login" element={<StudentAuth />} />
      </Routes>
      <StudentEntryGate />
      <LockerSubtestFix />
      <HideOldMentorFix />
      <WacawaciUploadFix />
      <MentorContentManagerFix />
      <Toaster richColors position="top-right" />
    </>
  );
}
