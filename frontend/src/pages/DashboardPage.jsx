import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSoar } from '../context/SoarContext';
import { focusOutput } from '../utils/focusOutput';

function DashboardPage() {
  const { loadMetrics, loadOverview, loadTimeseries, setStatus } = useSoar();
  const [metrics, setMetrics] = useState(null);
  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState([]);

  async function refreshDashboard() {
    try {
      const [metricsData, overviewData, timeseriesData] = await Promise.all([
        loadMetrics(),
        loadOverview(),
        loadTimeseries(),
      ]);
      setMetrics(metricsData);
      setOverview(overviewData);
      setTimeseries(timeseriesData.points || []);
      setStatus('Dashboard refreshed with latest SOAR telemetry.');
      focusOutput('dashboard-kpi-output');
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    refreshDashboard();
    const poller = setInterval(refreshDashboard, 20000);
    return () => clearInterval(poller);
  }, []);

  const severityData = Object.entries(metrics?.incidents_by_severity || {}).map(
    ([name, value]) => ({ name, value })
  );

  return (
    <>
      <section className="card focus-target" id="dashboard-kpi-output" tabIndex="-1">
        <h2>SOAR Metrics Dashboard</h2>
        <button onClick={refreshDashboard}>Refresh Dashboard</button>
        {overview ? (
          <div className="kpi-grid">
            <div className="kpi-box">
              <h3>Total Alerts</h3>
              <p>{overview.kpis.total_alerts}</p>
            </div>
            <div className="kpi-box">
              <h3>Total Incidents</h3>
              <p>{overview.kpis.total_incidents}</p>
            </div>
            <div className="kpi-box">
              <h3>Playbook Actions</h3>
              <p>{overview.kpis.total_playbook_actions}</p>
            </div>
            <div className="kpi-box">
              <h3>Unresolved Cases</h3>
              <p>{overview.kpis.unresolved_incidents}</p>
            </div>
          </div>
        ) : (
          <p>Loading dashboard...</p>
        )}
      </section>

      <section className="grid two-cols">
        <article className="card chart-card">
          <h2>Incident and Action Trend (7 days)</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="alerts" stroke="#0284c7" />
                <Line type="monotone" dataKey="incidents" stroke="#ef4444" />
                <Line type="monotone" dataKey="actions" stroke="#16a34a" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card chart-card">
          <h2>Attack Type Distribution</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overview?.attack_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid two-cols">
        <article className="card chart-card">
          <h2>Action Type Distribution</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overview?.action_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card chart-card">
          <h2>Incidents by Severity</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Tooltip />
                <Pie data={severityData} dataKey="value" nameKey="name" outerRadius={100} fill="#7c3aed" label />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </>
  );
}

export default DashboardPage;
