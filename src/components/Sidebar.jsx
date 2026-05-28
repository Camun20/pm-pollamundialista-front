import React, { useState } from 'react';
import {
  Menu, X, Trophy, BarChart2, Users, CalendarDays, LogOut, UserCircle2, ChevronRight,
  Shield, Swords, Crown, Medal, CalendarPlus, Grid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ADMIN_MENU = [
  { key: 'partidos',      label: 'Generar Partidos',       Icon: CalendarPlus },
  { key: 'fase-grupos',   label: 'Fase de Grupos',         Icon: Grid         },
  { key: 'fase-16',       label: 'Dieciseisavos',          Icon: Shield       },
  { key: 'fase-8',        label: 'Octavos de Final',       Icon: Swords       },
  { key: 'fase-4',        label: 'Cuartos de Final',       Icon: Swords       },
  { key: 'fase-2',        label: 'Semifinal',              Icon: Swords       },
  { key: 'fase-1',        label: 'Final',                  Icon: Crown        },
  { key: 'pronosticos',   label: 'Pronósticos por Partido', Icon: BarChart2    },
  { key: 'usuarios',      label: 'Gestionar Usuarios',     Icon: Users        },
  { key: 'puntuacion',    label: 'Tabla de Puntuación',    Icon: Medal        },
];

const USER_MENU = [
  { key: 'mis-pronosticos', label: 'Mis Pronósticos',     Icon: Trophy       },
  { key: 'fase-grupos',     label: 'Fase de Grupos',       Icon: Grid         },
  { key: 'fase-16',         label: 'Dieciseisavos',        Icon: Shield       },
  { key: 'fase-8',          label: 'Octavos de Final',     Icon: Swords       },
  { key: 'fase-4',          label: 'Cuartos de Final',     Icon: Swords       },
  { key: 'fase-2',          label: 'Semifinal',            Icon: Swords       },
  { key: 'fase-1',          label: 'Final',                Icon: Crown        },
  { key: 'puntuacion',      label: 'Tabla de Puntuación',  Icon: Medal        },
];

export default function Sidebar({ activeSection, onSectionChange }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const menu = user?.rol === 'admin' ? ADMIN_MENU : USER_MENU;

  const handleSelect = (key) => {
    onSectionChange(key);
    setOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d1b2a] text-gray-100">
      {/* Cabecera del panel (Más compacta en móviles) */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-brand-blue-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
            <UserCircle2 size={18} className="text-gold-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">{user?.nombre}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gold-500">
              {user?.rol === 'admin' ? 'Administrador' : 'Jugador'}
            </p>
          </div>
        </div>
        {/* Botón cerrar para móvil */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-brand-blue-800 transition-all"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navegación (Más compacta en móviles) */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {menu.map(({ key, label, Icon }) => {
          const isActive = activeSection === key;
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all group ${
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

      {/* Pie: botón cerrar sesión (Menos paddings en móviles) */}
      <div className="px-3 pb-4 pt-2 border-t border-brand-blue-800 shrink-0">
        <button
          onClick={() => { setOpen(false); logout(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );


  return (
    <>
      {/* ── Botón flotante de menú (FAB) (Solo visible en móviles/tabletas < lg, abajo a la derecha para no estorbar en el título) ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-gold-600 to-gold-500 text-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center border border-gold-400/20"
      >
        <Menu size={22} />
      </button>

      {/* ── Overlay (Solo visible en móviles/tabletas < lg) ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panel lateral (Fijo en desktop, deslizable en móvil) ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-40 border-r border-gold-500/10 shadow-2xl shadow-black/60
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </aside>
    </>
  );

}
