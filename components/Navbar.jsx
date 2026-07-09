import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Car, LogOut, User, Menu, X, Zap, LayoutDashboard, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const navLinks = isAuthenticated
    ? [
        { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
        { label: 'My Bookings', href: '/dashboard?tab=bookings', icon: <Car size={16} /> },
      ]
    : [
        { label: 'Home', href: '/' },
        { label: 'Login', href: '/login' },
      ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass border-b border-white/10 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" id="navbar-logo">
          <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-glow-blue group-hover:shadow-lg transition-all duration-300">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white">
            Drive<span className="gradient-text">Elite</span>
          </span>
          <span className="text-white/20 text-[10px] font-medium tracking-wider hidden sm:inline">INDIA</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              id={`nav-${link.label.toLowerCase().replace(' ', '-')}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === link.href
                  ? 'text-white bg-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/05'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right section */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* User avatar */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-white/80 text-sm font-medium">{user?.name?.split(' ')[0]}</span>
                {user?.email_verified && (
                  <span className="w-2 h-2 rounded-full bg-green-400" title="Verified" />
                )}
              </div>

              <button
                id="navbar-logout"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-red-400 transition-colors duration-200"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" id="navbar-login" className="btn-ghost text-sm py-2 px-4">
                Sign In
              </Link>
              <Link to="/login?tab=register" id="navbar-register" className="btn-primary text-sm py-2 px-5">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          id="navbar-mobile-toggle"
          className="md:hidden p-2 rounded-lg glass text-white/70 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden mt-2 mx-4 rounded-2xl glass-strong border border-white/10 overflow-hidden animate-scale-in">
          <div className="p-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/08 transition-all"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all text-left"
              >
                <LogOut size={16} />
                Logout
              </button>
            ) : (
              <Link
                to="/login?tab=register"
                onClick={() => setMobileOpen(false)}
                className="btn-primary text-center mt-2"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
