import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import StudentAuth from "@/pages/StudentAuth";
import AuthVisualFix from "@/components/AuthVisualFix";
import HideOldMentorFix from "@/components/HideOldMentorFix";
import WacawaciUploadFix from "@/components/WacawaciUploadFix";
import MentorContentManagerFix from "@/components/MentorContentManagerFix";
import MentorDashboardPlus from "@/components/MentorDashboardPlus";
import LockerSubtestFix from "@/components/LockerSubtestFix";
import StudentEntryGate from "@/components/StudentEntryGate";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<AuthVisualFix><Home /></AuthVisualFix>} />
        <Route path="/akun" element={<StudentAuth />} />
        <Route path="/login" element={<StudentAuth />} />
      </Routes>
      <StudentEntryGate />
      <HideOldMentorFix />
      <WacawaciUploadFix />
      <MentorContentManagerFix />
      <MentorDashboardPlus />
      <LockerSubtestFix />
      <Toaster richColors position="top-right" />
    </>
  );
}
