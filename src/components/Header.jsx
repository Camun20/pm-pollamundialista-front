import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logoEmpresa from '../assets/logo-empresa.png';
import logoMundial from '../assets/logo-mundial.png';

export default function Header() {
  const { user } = useAuth();
  const [hasLogoMundial, setHasLogoMundial] = useState(true);
  const [hasLogoEmpresa, setHasLogoEmpresa] = useState(true);

  return (
    <header className="border-b border-brand-blue-800 bg-brand-blue-900/60 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">

        {/* LOGOS Y TÍTULO — con margen izquierdo optimizado para móvil */}
        <div className="flex items-center gap-2 sm:gap-4 pl-8 sm:pl-12">
          {hasLogoEmpresa ? (
            <img
              src={logoEmpresa}
              alt="Empresa"
              onError={() => setHasLogoEmpresa(false)}
              className="h-8 sm:h-10 w-auto object-contain rounded-md shrink-0"
            />
          ) : null}

          {hasLogoMundial ? (
            <img
              src={logoMundial}
              alt="Mundial 2026"
              onError={() => setHasLogoMundial(false)}
              className="h-10 sm:h-12 w-auto object-contain shrink-0"
            />
          ) : (
            <span className="text-2xl sm:text-3xl select-none shrink-0">🏆</span>
          )}

          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black tracking-wider gold-gradient-text m-0 p-0 leading-none truncate sm:whitespace-normal">
              POLLA MUNDIALISTA ATIEMPO
            </h1>
            <p className="text-[9px] sm:text-[10px] text-brand-blue-600 font-bold uppercase tracking-widest mt-0.5">
              Mundial 2026
            </p>
          </div>
        </div>

        {/* USUARIO ACTIVO */}
        {user && (
          <div className="text-right">
            <p className="text-sm font-semibold text-white leading-tight">{user.nombre}</p>
            <p className="text-[10px] font-bold text-gold-500 uppercase tracking-widest">
              {user.rol === 'admin' ? 'Administrador' : 'Jugador'}
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
