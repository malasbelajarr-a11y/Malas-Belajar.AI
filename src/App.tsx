import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import StudentAuthGateV2 from "@/components/StudentAuthGateV2";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <StudentAuthGateV2>
              <Home />
            </StudentAuthGateV2>
          }
        />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}
