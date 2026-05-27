import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { FIFA_2026_TEAMS, getFlagUrl } from '../utils/fifa2026Teams';

/**
 * Selector de país con búsqueda y bandera.
 * @param {object} props
 * @param {string}   props.value       - Nombre del país seleccionado
 * @param {Function} props.onChange    - Callback (countryName: string) => void
 * @param {string}   [props.placeholder]
 * @param {string}   [props.label]
 * @param {boolean}  [props.disabled]
 */
export default function CountrySelector({ value, onChange, placeholder = "Selecciona un equipo", label, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = FIFA_2026_TEAMS.find(t => t.name === value);
  const filtered = FIFA_2026_TEAMS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (team) => {
    onChange(team.name);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className="relative w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-1">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all focus:outline-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-brand-blue-900/30 border-brand-blue-800/60'
            : 'bg-brand-blue-900/60 border-gold-500/15 hover:border-gold-500/30 focus:ring-1 focus:ring-gold-500'
        }`}
      >
        {selected ? (
          <>
            <img
              src={getFlagUrl(selected.code)}
              alt={selected.name}
              className="h-5 w-5 rounded-full object-cover aspect-square"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="flex-1 font-semibold text-white">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-500">{placeholder}</span>
        )}
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gold-500/15 bg-[#0d1b2a] shadow-2xl overflow-hidden">
          {/* Buscador */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-blue-800">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Lista */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">Sin resultados</li>
            ) : (
              filtered.map((team) => (
                <li key={team.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(team)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gold-500/10 transition-colors ${
                      value === team.name ? 'text-gold-400 font-bold' : 'text-gray-200'
                    }`}
                  >
                    <img
                      src={getFlagUrl(team.code)}
                      alt={team.name}
                      className="h-5 w-5 rounded-full object-cover aspect-square"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {team.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
