import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import AuthVisualFix from "@/components/AuthVisualFix";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <AuthVisualFix>
              <Home />
            </AuthVisualFix>
          }
        />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}
