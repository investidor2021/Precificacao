'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Calculator, 
  ArrowLeftRight, 
  BrainCircuit, 
  Settings, 
  Menu, 
  X,
  TrendingUp
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Produtos', path: '/products', icon: Package },
    { name: 'Simulador', path: '/simulator', icon: Calculator },
    { name: 'Comparador', path: '/compare', icon: ArrowLeftRight },
    { name: 'Preço Inteligente', path: '/smart-pricing', icon: BrainCircuit },
    { name: 'Configurações', path: '/settings', icon: Settings },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-white z-40 w-full sticky top-0">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-6 h-6 text-emerald-400 animate-pulse" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
            Precifica.AI
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-md text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo Brand */}
          <div className="hidden md:flex items-center space-x-2 px-6 py-8 border-b border-slate-900">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Precifica.AI
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="mt-8 px-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500 shadow-[inset_4px_0_12px_rgba(16,185,129,0.05)]'
                      : 'hover:bg-slate-900/60 hover:text-white border-l-4 border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-900 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Sistema</span>
            <span className="text-xs text-slate-400">v1.0.0 Stable</span>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  );
}
