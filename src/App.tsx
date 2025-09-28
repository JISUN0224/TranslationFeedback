import { Routes, Route } from 'react-router-dom';
import MainMenu from './MainMenu';
import ExistingProblems from './ExistingProblems';
import AIGeneratedProblems from './AIGeneratedProblems';
import TranslationHistory from './TranslationHistory';
import StudyDashboard from './components/dashboard/StudyDashboard';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/existing-problems" element={<ExistingProblems />} />
      <Route path="/ai-generated" element={<AIGeneratedProblems />} />
      <Route path="/translation-history" element={<TranslationHistory />} />
      <Route path="/dashboard" element={<StudyDashboard />} />
    </Routes>
  );
}
