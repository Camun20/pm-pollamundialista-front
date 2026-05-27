import React, { useState } from 'react';
import {
  Menu, X, Trophy, BarChart2, Users, CalendarDays, LogOut, UserCircle2, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ADMIN_MENU = [
  { key: 'partidos',    label: 'Partidos y Resultados', Icon: CalendarDays },
  { key: 'pronosticos', label: 'Pronósticos por Partido', Icon: BarChart2  },
  { key: 'usuarios',    label: 'Gestionar Usuarios',     Icon: Users        },
];

const USER_MENU = [
  { key: 'mis-pronosticos', label: 'Mis Pronósticos',  Icon: Trophy       },
  { key: 'partidos',        label: 'Partidos y Apuestas', Icon: CalendarDays },
];

export default function Sidebar({ activeSection, onSectionChange }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const menu = user?.rol === 'admin' ? ADMIN_MENU : USER_MENU;

  const handleSelect = (key) => {
    onSectionChange(key);
    setOpen(false);
  };

  return (
    <>
      {/* ── Botón hamburguesa (siempre visible) ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="fixed top-[72px] left-4 z-50 p-2.5 rounded-xl glass-card border border-gold-500/20 text-gold-500 hover:bg-gold-500/10 transition-all shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* ── Overlay ── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panel lateral ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-[#0d1b2a] border-r border-gold-500/10 shadow-2xl shadow-black/60
          transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Cabecera del panel */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-brand-blue-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
              <UserCircle2 size={20} className="text-gold-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{user?.nombre}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gold-500">{user?.rol}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-brand-blue-800 transition-all"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menu.map(({ key, label, Icon }) => {
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20'
                    : 'text-gray-300 hover:bg-brand-blue-800/60 hover:text-white border border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-gold-400' : 'text-brand-blue-600 group-hover:text-gray-300'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-gold-500" />}
              </button>
            );
          })}
        </nav>

        {/* Pie: botón cerrar sesión */}
        <div className="px-3 pb-6 pt-3 border-t border-brand-blue-800">
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
