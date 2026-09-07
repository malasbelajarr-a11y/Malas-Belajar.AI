import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import StudentAuthGate from "@/components/StudentAuthGate";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <StudentAuthGate>
              <Home />
            </StudentAuthGate>
          }
        />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}
