import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import { SoarProvider } from './context/SoarContext';
import DashboardPage from './pages/DashboardPage';
import GovernancePage from './pages/GovernancePage';
import HomePage from './pages/HomePage';
import IncidentsPage from './pages/IncidentsPage';
import LabPage from './pages/LabPage';
import OperationsPage from './pages/OperationsPage';

function App() {
  return (
    <SoarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="incidents" element={<IncidentsPage />} />
            <Route path="governance" element={<GovernancePage />} />
            <Route path="lab" element={<LabPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SoarProvider>
  );
}

export default App;
