import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert, Lock, Loader2, AlertTriangle, UserRound } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

const AdminLogin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ identifier: '', password: '' });

  const handleChange = (e) => {
    setFormData((previous) => ({ ...previous, [e.target.name]: e.target.value }));
  };

  const handleSecureLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.identifier.trim() || !formData.password) {
      setError('Admin email/username aur password required hain.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        identifier: formData.identifier.trim(),
        password: formData.password,
      });
      const data = response.data;

      if (!data?.success || String(data?.user?.role || '').toLowerCase() !== 'admin') {
        setError('Admin access required.');
        return;
      }

      localStorage.setItem('auth_token', data.token || '');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          username: data.user.username,
          role: data.user.role,
          isLoggedIn: true,
        })
      );

      navigate('/app/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Admin login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C2134] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4A86F7] via-[#17344D] to-[#0C2134]" />
      <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -top-20 -left-20" />

      <div className="w-full max-w-md bg-[#0C2134] border border-[#30485F] rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="bg-[#0C2134]/40 p-8 border-b border-white/[0.08] text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-400/20 text-[#4A86F7]">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Restricted Admin Access</h2>
          <p className="text-slate-500 text-sm mt-2">Ali Cages Administration Gateway</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-950/30 border border-red-900/50 p-4 rounded flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <p className="text-red-400 text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSecureLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Admin Email / Username</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500"><UserRound size={16} /></span>
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  className="w-full bg-[#0C2134] border border-[#30485F] text-slate-100 pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500/30 transition text-sm"
                  placeholder="Admin email ya username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500"><Lock size={16} /></span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-[#0C2134] border border-[#30485F] text-slate-100 pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500/30 transition text-sm"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 bg-[#4A86F7] hover:bg-[#3975E7] text-white disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} />}
              {isLoading ? 'VERIFYING...' : 'SECURE LOGIN'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300">
              Normal user login
            </Link>
          </div>
        </div>

        <div className="bg-[#0C2134] p-3 text-center border-t border-white/[0.08] text-xs text-slate-600">
          Database-backed admin authentication
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
