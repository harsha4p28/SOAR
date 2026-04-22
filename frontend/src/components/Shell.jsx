import { NavLink, Outlet } from 'react-router-dom';
import { useSoar } from '../context/SoarContext';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/operations', label: 'Operations' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/governance', label: 'Governance' },
  { to: '/lab', label: 'Vulnerability Lab' },
];

function Shell() {
  const { status } = useSoar();

  return (
    <div className="container">
      <header className="hero">
        <h1>SOAR Command Center</h1>
        <p>Live orchestration for web application security operations.</p>
      </header>

      <nav className="nav-strip card">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link-active' : 'nav-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
        <a className="nav-link docs-link" href="https://supabase.com/docs/guides/database/connecting-to-postgres" target="_blank" rel="noreferrer">
          Postgres Guide
        </a>
      </nav>

      <Outlet />

      <footer className="status">Status: {status}</footer>
    </div>
  );
}

export default Shell;
