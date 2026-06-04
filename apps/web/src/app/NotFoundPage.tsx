import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-6">
          <Compass className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          This page seems to have wandered off the map.
        </p>
        <Link
          to="/dashboard"
          className="btn-primary btn inline-flex items-center gap-2"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
