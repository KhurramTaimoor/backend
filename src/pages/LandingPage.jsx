import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import {
  Bird,
  LogIn,
  Menu,
  ShieldCheck,
  ArrowRight,
  Boxes,
  ClipboardList,
  TrendingUp,
  Check,
  CircleCheck,
  Warehouse,
  PackageCheck,
  FileText,
  Users,
  BarChart3,
  Moon,
  Sun,
} from 'lucide-react';

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    AOS.init({
      once: true,
      offset: 50,
      duration: 800,
      easing: 'ease-out-cubic',
    });

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apni image ka direct link yahan lagao
  const heroImage =
  'data:image/jpeg;base64,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';

  return (
    <div
      className={`antialiased transition-all duration-300 ${
        darkMode ? 'bg-[#0C2134] text-white' : 'bg-white text-slate-900'
      }`}
    >
      {/* NAVBAR */}
      <nav
        className={`fixed w-full z-50 transition-all duration-300 border-b ${
          darkMode
            ? 'bg-[#0C2134]/95 border-slate-800 backdrop-blur-md'
            : isScrolled
            ? 'bg-white/95 shadow-md backdrop-blur-md border-blue-100'
            : 'bg-white/80 border-blue-100 backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#4A86F7] to-[#3975E7] rounded-lg flex items-center justify-center text-white mr-3 shadow-lg shadow-blue-500/20">
                <Bird size={20} />
              </div>
              <div className="flex flex-col">
                <span
                  className={`font-bold text-xl tracking-tight leading-none ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Ali Cages
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Inventory Software
                </span>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className={`text-sm font-semibold transition ${
                  darkMode
                    ? 'text-slate-300 hover:text-blue-400'
                    : 'text-slate-600 hover:text-[#285DB8]'
                }`}
              >
                Modules
              </a>
              <a
                href="#analytics"
                className={`text-sm font-semibold transition ${
                  darkMode
                    ? 'text-slate-300 hover:text-blue-400'
                    : 'text-slate-600 hover:text-[#285DB8]'
                }`}
              >
                Reports
              </a>
              <a
                href="#showcase"
                className={`text-sm font-semibold transition ${
                  darkMode
                    ? 'text-slate-300 hover:text-blue-400'
                    : 'text-slate-600 hover:text-[#285DB8]'
                }`}
              >
                Inventory View
              </a>

              <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full border border-green-100">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                System Online
              </div>
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg border transition ${
                  darkMode
                    ? 'bg-[#0C2134] border-slate-700 text-yellow-300'
                    : 'bg-blue-50 border-blue-100 text-[#285DB8]'
                }`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <Link
                to="/login"
                className={`px-6 py-2.5 rounded-lg font-medium transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm flex items-center gap-2 ${
                  darkMode
                    ? 'bg-white text-slate-900 hover:bg-slate-200'
                    : 'bg-[#0C2134] hover:bg-[#17344D] text-white'
                }`}
              >
                <LogIn size={16} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                Login 
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg border transition ${
                  darkMode
                    ? 'bg-[#0C2134] border-slate-700 text-yellow-300'
                    : 'bg-blue-50 border-blue-100 text-[#285DB8]'
                }`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                className={
                  darkMode ? 'text-white focus:outline-none' : 'text-slate-600 focus:outline-none'
                }
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header
        className={`relative pt-32 pb-24 lg:pt-44 lg:pb-32 overflow-hidden min-h-[95vh] flex items-center transition-all duration-300 ${
          darkMode
            ? 'bg-[#0C2134]'
            : 'bg-gradient-to-br from-white via-blue-50 to-sky-100'
        }`}
      >
        <div
          className={`absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 ${
            darkMode ? 'bg-[#4A86F7]/10' : 'bg-blue-300/30'
          }`}
        ></div>
        <div
          className={`absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 ${
            darkMode ? 'bg-indigo-600/10' : 'bg-sky-200/40'
          }`}
        ></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div data-aos="fade-right" data-aos-duration="1000">
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider mb-8 backdrop-blur-sm ${
                  darkMode
                    ? 'bg-slate-800/60 border-slate-700 text-blue-300'
                    : 'bg-white/80 border-blue-100 text-[#285DB8] shadow-sm'
                }`}
              >
                <ShieldCheck size={14} /> Built for Cage Inventory & Operations
              </div>

              <h1
                className={`text-5xl lg:text-7xl font-bold leading-[1.08] mb-6 tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Ali Cages <br />
                <span
                  className={`text-transparent bg-clip-text bg-gradient-to-r ${
                    darkMode
                      ? 'from-blue-400 via-blue-200 to-white'
                      : 'from-[#4A86F7] via-sky-500 to-blue-400'
                  }`}
                >
                  Inventory Management.
                </span>
              </h1>

              <p
                className={`text-lg mb-10 leading-relaxed max-w-xl font-light ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                A smart web application for managing cage stock, daily sales, orders, staff
                activity, and report exports — all from one centralized dashboard.
              </p>

              <div className="flex flex-col sm:flex-row gap-5">
                <Link
                  to="/register"
                  className="bg-[#4A86F7] hover:bg-blue-500 text-white font-semibold py-4 px-8 rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] transition transform hover:-translate-y-1 flex items-center justify-center gap-3 border border-[#4A86F7]"
                >
                  Access Dashboard <ArrowRight size={18} />
                </Link>
              </div>

              <div
                className={`mt-12 grid grid-cols-3 gap-6 border-t pt-8 ${
                  darkMode ? 'border-slate-800' : 'border-blue-100'
                }`}
              >
                <div>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    4.2k+
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">
                    Cages in Stock
                  </div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    24/7
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">
                    Inventory Access
                  </div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Secure
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">
                    Cloud Based
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content */}
            <div
              id="showcase"
              className="relative hidden lg:block"
              data-aos="fade-left"
              data-aos-duration="1200"
              data-aos-delay="200"
            >
              <div
                className={`rounded-2xl p-1 shadow-2xl animate-float relative z-20 backdrop-blur-xl border ${
                  darkMode
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white/80 border-blue-100 shadow-blue-100/60'
                }`}
              >
                <div
                  className={`rounded-[18px] overflow-hidden border ${
                    darkMode
                      ? 'bg-[#0C2134]/90 border-slate-700/50'
                      : 'bg-white border-blue-100'
                  }`}
                >
                  <div
                    className={`px-4 py-3 flex items-center justify-between border-b ${
                      darkMode
                        ? 'bg-slate-800/50 border-slate-700/50'
                        : 'bg-blue-50 border-blue-100'
                    }`}
                  >
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                      <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      ali-cages-dashboard.jsx
                    </div>
                  </div>

                  <div className="grid grid-cols-5 min-h-[520px]">
                    <div
                      className={`col-span-3 p-6 border-r ${
                        darkMode ? 'border-slate-800' : 'border-blue-100'
                      }`}
                    >
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div
                          className={`p-4 rounded border ${
                            darkMode
                              ? 'bg-slate-800/60 border-slate-700/50'
                              : 'bg-blue-50 border-blue-100'
                          }`}
                        >
                          <div className="text-slate-400 text-[10px] uppercase mb-1">Total Stock</div>
                          <div className={`${darkMode ? 'text-white' : 'text-slate-900'} text-xl font-mono`}>
                            4,218
                          </div>
                        </div>

                        <div
                          className={`p-4 rounded border ${
                            darkMode
                              ? 'bg-slate-800/60 border-slate-700/50'
                              : 'bg-blue-50 border-blue-100'
                          }`}
                        >
                          <div className="text-slate-400 text-[10px] uppercase mb-1">Low Stock</div>
                          <div className="text-orange-400 text-xl font-mono">09 Items</div>
                        </div>

                        <div
                          className={`p-4 rounded border ${
                            darkMode
                              ? 'bg-slate-800/60 border-slate-700/50'
                              : 'bg-blue-50 border-blue-100'
                          }`}
                        >
                          <div className="text-slate-400 text-[10px] uppercase mb-1">Orders Today</div>
                          <div className="text-green-400 text-xl font-mono">34 Open</div>
                        </div>
                      </div>

                      <div
                        className={`rounded-xl overflow-hidden border mb-6 h-[250px] ${
                          darkMode ? 'border-slate-700/50' : 'border-blue-100'
                        }`}
                      >
                        <img
                          src={heroImage}
                          alt="Ali Cages inventory display"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`p-4 rounded-lg border ${
                            darkMode
                              ? 'bg-slate-800/50 border-slate-700/50'
                              : 'bg-blue-50 border-blue-100'
                          }`}
                        >
                          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                            Top Category
                          </div>
                          <div className={`${darkMode ? 'text-white' : 'text-slate-900'} font-semibold`}>
                            Premium Bird Cages
                          </div>
                          <div className="text-slate-500 text-sm mt-1">
                            Fast-moving inventory this week
                          </div>
                        </div>

                        <div
                          className={`p-4 rounded-lg border ${
                            darkMode
                              ? 'bg-slate-800/50 border-slate-700/50'
                              : 'bg-blue-50 border-blue-100'
                          }`}
                        >
                          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                            Warehouse Status
                          </div>
                          <div className="text-green-400 font-semibold">Synced Successfully</div>
                          <div className="text-slate-500 text-sm mt-1">
                            All inventory records up to date
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`col-span-2 p-5 ${
                        darkMode ? 'bg-[#0C2134]/60' : 'bg-sky-50/80'
                      }`}
                    >
                      <div className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Recent Cage Stock
                      </div>

                      <div className="space-y-3">
                        {[
                          { name: 'Steel Bird Cage', qty: '128 pcs', status: 'In Stock' },
                          { name: 'Wooden Fancy Cage', qty: '18 pcs', status: 'Low Stock' },
                          { name: 'Breeding Cage Set', qty: '64 pcs', status: 'In Stock' },
                          { name: 'Feeding Tray Pack', qty: '240 pcs', status: 'In Stock' },
                        ].map((item, index) => (
                          <div
                            key={index}
                            className={`rounded-lg border p-3 ${
                              darkMode
                                ? 'border-slate-800 bg-[#0C2134]/70'
                                : 'border-blue-100 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div
                                  className={`text-sm font-medium ${
                                    darkMode ? 'text-white' : 'text-slate-900'
                                  }`}
                                >
                                  {item.name}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  Available: {item.qty}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                  item.status === 'Low Stock'
                                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                    : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className={`mt-6 pt-6 border-t ${
                          darkMode ? 'border-slate-800' : 'border-blue-100'
                        }`}
                      >
                        <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                          Weekly Sales Trend
                        </div>
                        <div className="flex items-end justify-between h-28 gap-3 px-1">
                          <div
                            className={`w-full rounded-t h-[35%] ${
                              darkMode ? 'bg-slate-700/30' : 'bg-blue-100'
                            }`}
                          ></div>
                          <div
                            className={`w-full rounded-t h-[50%] ${
                              darkMode ? 'bg-slate-700/30' : 'bg-blue-100'
                            }`}
                          ></div>
                          <div className="w-full bg-[#4A86F7] rounded-t h-[82%] shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
                          <div
                            className={`w-full rounded-t h-[60%] ${
                              darkMode ? 'bg-slate-700/30' : 'bg-blue-100'
                            }`}
                          ></div>
                          <div
                            className={`w-full rounded-t h-[45%] ${
                              darkMode ? 'bg-slate-700/30' : 'bg-blue-100'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`absolute -bottom-6 -right-6 z-30 p-4 rounded-lg shadow-xl border-l-4 border-green-500 flex items-center gap-4 animate-bounce ${
                  darkMode ? 'bg-[#0C2134]' : 'bg-white'
                }`}
                style={{ animationDuration: '3s' }}
              >
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <Check size={20} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">
                    Inventory Alert
                  </div>
                  <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    Stock Report Exported
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section className={`py-24 ${darkMode ? 'bg-[#0C2134]' : 'bg-slate-50'}`} id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16">
            <div data-aos="fade-right">
              <h2 className="text-[#4A86F7] font-bold tracking-wide uppercase text-sm mb-2">
                Core Modules
              </h2>
              <h3 className={`text-3xl md:text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Everything Ali Cages Needs
              </h3>
            </div>
            <div
              className={`mt-4 md:mt-0 text-sm max-w-sm text-right ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
              data-aos="fade-left"
            >
              From warehouse inventory to employee workflow and sales reporting — all managed
              in one web application.
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Warehouse size={24} />,
                title: 'Inventory Control',
                text: 'Track cage models, accessories, parts, and warehouse quantities with low-stock alerts and category-based organization.',
              },
              {
                icon: <Users size={24} />,
                title: 'Staff & Daily Work',
                text: 'Maintain employee entries, assign daily work, monitor activity, and keep operations accountable with digital logs.',
              },
              {
                icon: <FileText size={24} />,
                title: 'Sales & Reports',
                text: 'Create invoices, track customer orders, and export stock or sales reports in PDF and CSV formats instantly.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`rounded-xl p-8 shadow-sm border group transition-all duration-300 relative overflow-hidden ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'
                }`}
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <div className="w-12 h-12 bg-[#4A86F7] rounded-lg flex items-center justify-center text-white mb-6 relative z-10 shadow-lg shadow-blue-500/30">
                  {item.icon}
                </div>
                <h4 className={`text-xl font-bold mb-3 relative z-10 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {item.title}
                </h4>
                <p className={`leading-relaxed text-sm relative z-10 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section
        id="analytics"
        className={`py-24 overflow-hidden border-t ${
          darkMode ? 'bg-[#0C2134] border-slate-800' : 'bg-white border-blue-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2" data-aos="fade-right">
              <div className="w-12 h-1 bg-[#4A86F7] mb-6"></div>
              <h3 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Smart Inventory Analytics
              </h3>
              <p className={`text-lg mb-8 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Ali Cages dashboard turns everyday stock movements into useful insights. View
                product performance, monitor low stock items, and compare sales activity across
                days or months.
              </p>

              <ul className="space-y-4">
                {[
                  'Real-time Stock Updates',
                  'PDF / CSV Export Reports',
                  'Sales & Employee Performance Metrics',
                ].map((item, index) => (
                  <li
                    key={index}
                    className={`flex items-center font-medium ${
                      darkMode ? 'text-slate-200' : 'text-slate-700'
                    }`}
                  >
                    <CircleCheck size={20} className="text-[#4A86F7] mr-3" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:w-1/2 relative" data-aos="fade-left">
              <div
                className={`absolute -inset-4 rounded-3xl transform -rotate-2 ${
                  darkMode ? 'bg-[#0C2134]' : 'bg-gradient-to-r from-slate-100 to-blue-50'
                }`}
              ></div>

              <div
                className={`relative border rounded-2xl shadow-xl p-8 ${
                  darkMode ? 'bg-[#0C2134] border-slate-700' : 'bg-white border-blue-100'
                }`}
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      Monthly Stock Movement
                    </h4>
                    <p className="text-xs text-slate-400">Jan 01 - Jan 31, 2026</p>
                  </div>
                  <div className="bg-blue-50 text-[#4A86F7] px-3 py-1 rounded text-xs font-bold flex items-center gap-2">
                    <BarChart3 size={14} /> Live View
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    ['Received', '1,280'],
                    ['Sold', '946'],
                    ['Returns', '21'],
                    ['Alerts', '9'],
                  ].map(([label, value], i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 ${
                        darkMode ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-slate-50'
                      }`}
                    >
                      <div className="text-xs text-slate-400 mb-1">{label}</div>
                      <div
                        className={`font-bold ${
                          i === 3 ? 'text-orange-500' : darkMode ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className={`flex items-end justify-between h-56 gap-4 pb-4 border-b ${
                    darkMode ? 'border-slate-700' : 'border-blue-100'
                  }`}
                >
                  <div className="w-full flex flex-col items-center gap-2 group">
                    <div
                      className={`w-full rounded-t-sm h-16 transition-all duration-500 ${
                        darkMode ? 'bg-slate-700' : 'bg-slate-100 group-hover:bg-blue-200'
                      }`}
                    ></div>
                    <span className="text-xs text-slate-400">W1</span>
                  </div>
                  <div className="w-full flex flex-col items-center gap-2 group">
                    <div
                      className={`w-full rounded-t-sm h-24 transition-all duration-500 ${
                        darkMode ? 'bg-slate-700' : 'bg-slate-100 group-hover:bg-blue-200'
                      }`}
                    ></div>
                    <span className="text-xs text-slate-400">W2</span>
                  </div>
                  <div className="w-full flex flex-col items-center gap-2 group">
                    <div className="w-full bg-[#4A86F7] rounded-t-sm h-40 shadow-lg shadow-blue-500/40 relative">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded">
                        346 Units
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      W3
                    </span>
                  </div>
                  <div className="w-full flex flex-col items-center gap-2 group">
                    <div
                      className={`w-full rounded-t-sm h-32 transition-all duration-500 ${
                        darkMode ? 'bg-slate-700' : 'bg-slate-100 group-hover:bg-blue-200'
                      }`}
                    ></div>
                    <span className="text-xs text-slate-400">W4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXTRA STRIP */}
      <section
        className={`py-20 ${
          darkMode ? 'bg-[#0C2134] text-white' : 'bg-white text-slate-900'
        } border-t ${darkMode ? 'border-slate-800' : 'border-blue-100'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: <Boxes size={22} />,
                title: 'Product Catalog',
                text: 'Manage every cage design, size, material, and model from a single system.',
              },
              {
                icon: <PackageCheck size={22} />,
                title: 'Order Tracking',
                text: 'Follow incoming and completed orders with cleaner status visibility.',
              },
              {
                icon: <ClipboardList size={22} />,
                title: 'Daily Logs',
                text: 'Keep staff work records and daily updates structured and searchable.',
              },
              {
                icon: <TrendingUp size={22} />,
                title: 'Growth Reports',
                text: 'Measure inventory flow, stock movement, and sales performance over time.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`rounded-2xl p-6 backdrop-blur-sm border ${
                  darkMode
                    ? 'bg-[#0C2134] border-slate-800'
                    : 'bg-slate-50 border-blue-100'
                }`}
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    darkMode
                      ? 'bg-[#4A86F7]/20 border border-[#4A86F7]/20 text-blue-300'
                      : 'bg-blue-50 border border-blue-100 text-[#4A86F7]'
                  }`}
                >
                  {item.icon}
                </div>
                <h4 className="text-lg font-semibold mb-2">{item.title}</h4>
                <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-sm leading-relaxed`}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className={`py-10 border-t ${
          darkMode
            ? 'bg-[#0C2134] text-slate-400 border-slate-800'
            : 'bg-white text-slate-500 border-blue-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Ali Cages.
              </span>
              <span
                className={`ml-3 text-xs px-2 py-1 rounded ${
                  darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}
              >
                Inventory Web App
              </span>
            </div>
            <div className="text-sm">Authorized Personnel Only. &copy; 2026</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
