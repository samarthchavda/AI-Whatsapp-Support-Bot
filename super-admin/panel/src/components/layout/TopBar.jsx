import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import { findNavItem } from '../../lib/navigation';

const THEME_KEY = 'kb-theme';

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export default function TopBar({ onMenu }) {
  const { pathname } = useLocation();
  const current = findNavItem(pathname);
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  }, [theme]);

  const systemDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = theme ? theme === 'dark' : systemDark;

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // storage unavailable, the choice lasts for this visit
    }
  };

  return (
    <header className="topbar">
      <button type="button" className="btn btn-ghost btn-icon topbar-menu" onClick={onMenu} aria-label="Open navigation">
        <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <div className="crumb">
        Kwickbot admin
        {current && <> / <strong>{current.label}</strong></>}
      </div>
      <div className="topbar-spacer" />
      <button type="button" className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label={isDark ? 'Use light theme' : 'Use dark theme'} title={isDark ? 'Light theme' : 'Dark theme'}>
        {isDark ? <Sun size={16} strokeWidth={1.5} aria-hidden="true" /> : <Moon size={16} strokeWidth={1.5} aria-hidden="true" />}
      </button>
    </header>
  );
}
