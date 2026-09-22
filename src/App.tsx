import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProjectWorkspace from './pages/ProjectWorkspace';
import ERPPage from './pages/ERPPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/workspace/:projectId" element={<ProjectWorkspace />} />
      <Route path="/erp" element={<ERPPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
