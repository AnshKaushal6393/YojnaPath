import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SchemeDetailPage from "./pages/SchemeDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/schemes/:schemeId" element={<SchemeDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
