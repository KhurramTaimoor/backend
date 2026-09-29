import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-800">
      <ShieldAlert size={64} className="text-red-600 mb-4" />
      <h1 className="text-4xl font-bold mb-2">Access Denied</h1>
      <p className="text-slate-500 mb-6">You do not have permission to view this page.</p>
      <Link to="/" className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-slate-800">
        Go Home
      </Link>
    </div>
  );
};

export default Unauthorized;