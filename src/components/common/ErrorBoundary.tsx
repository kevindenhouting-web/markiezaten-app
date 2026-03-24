import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        if (this.state.error?.message) {
          errorDetails = JSON.parse(this.state.error.message);
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Oeps! Er ging iets mis</h1>
            <p className="text-slate-500 mb-8">
              {errorDetails ? 
                `Er is een probleem met de database (${errorDetails.operationType}).` : 
                "Er is een onverwachte fout opgetreden in de applicatie."}
            </p>
            
            {errorDetails && (
              <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left overflow-auto max-h-40">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Technische Details</p>
                <code className="text-xs text-red-600 block whitespace-pre-wrap">
                  {errorDetails.error}
                </code>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center space-x-2 bg-markiezaten-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-markiezaten-dark transition-all shadow-lg shadow-markiezaten-blue/20"
            >
              <RefreshCw size={20} />
              <span>Opnieuw Proberen</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
