import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = ''; // Redirigir al inicio/login
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto mt-16 px-4 text-center animate-fade-in">
          <div className="glass-card rounded-3xl p-8 border border-rose-500/30 bg-rose-950/10 text-center relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle size={32} />
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-rose-300 tracking-wide mb-2">
              Ha ocurrido un error inesperado
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              El panel ha experimentado un problema al renderizar los datos. Esto puede deberse a datos incompletos en la base de datos o un fallo de conexión.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 rounded-xl bg-black/40 border border-rose-500/15 text-left font-mono text-xs text-rose-300 max-h-40 overflow-y-auto">
                <span className="font-bold">Detalle del error:</span>
                <p className="mt-1 whitespace-pre-wrap">{this.state.error.toString()}</p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
            >
              <RotateCcw size={16} />
              <span>Reintentar y Limpiar Sesión</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
