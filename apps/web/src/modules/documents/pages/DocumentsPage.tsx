import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, Upload, Ticket, FileCheck, Globe, ShieldCheck, Receipt, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api/client.ts';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { Button } from '@/shared/components/ui/Button.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import { Badge } from '@/shared/components/ui/Badge.tsx';

import type { ApiResponse } from '@wanderlog/shared';

interface Document {
  id: string;
  title: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  createdAt: string;
  trip?: { id: string; title: string } | null;
}

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'blue' | 'green' | 'amber' | 'purple' | 'slate' | 'red' }> = {
  TICKET:               { label: 'Ticket',        icon: Ticket,     variant: 'blue'   },
  BOOKING_CONFIRMATION: { label: 'Booking',       icon: FileCheck,  variant: 'green'  },
  PASSPORT:             { label: 'Passport',      icon: Globe,      variant: 'purple' },
  VISA:                 { label: 'Visa',           icon: Globe,      variant: 'purple' },
  INSURANCE:            { label: 'Insurance',     icon: ShieldCheck,variant: 'amber'  },
  ITINERARY:            { label: 'Itinerary',     icon: FileText,   variant: 'blue'   },
  VOUCHER:              { label: 'Voucher',        icon: Ticket,     variant: 'green'  },
  RECEIPT:              { label: 'Receipt',        icon: Receipt,    variant: 'slate'  },
  EMERGENCY_CONTACT:    { label: 'Emergency',     icon: AlertCircle,variant: 'red'    },
  OTHER:                { label: 'Other',          icon: FileText,   variant: 'slate'  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['all-documents'],
    queryFn: () => api.get<ApiResponse<Document[]>>('/users/me/documents'),
  });

  const docs = data?.data ?? [];

  // Group by type
  const grouped = docs.reduce<Record<string, Document[]>>((acc, d) => {
    (acc[d.type] ??= []).push(d);
    return acc;
  }, {});

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <TopBar
        title="Documents"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Upload className="w-4 h-4" />} disabled title="Upload coming soon">
            Upload
          </Button>
        }
      />
      <div className="page-container">
        <p className="section-subtitle mb-6">
          Your travel documents — tickets, passports, visas, insurance, and more
        </p>

        {docs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No documents yet"
            description="Upload tickets, booking confirmations, passports, visas, and other travel documents to keep them in one secure place."
            action={
              <Button variant="primary" leftIcon={<Upload className="w-4 h-4" />} disabled>
                Upload your first document
              </Button>
            }
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([type, typeDocs]) => {
              const config = DOC_TYPE_CONFIG[type] ?? DOC_TYPE_CONFIG.OTHER;
              const Icon = config.icon;
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      {config.label}s
                    </h2>
                    <span className="text-xs text-slate-400">({typeDocs.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {typeDocs.map((doc) => (
                      <div key={doc.id} className="card p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={config.variant}>{config.label}</Badge>
                            {doc.trip && (
                              <Link
                                to={`/trips/${doc.trip.id}`}
                                className="text-xs text-brand-600 dark:text-brand-400 hover:underline truncate"
                              >
                                {doc.trip.title}
                              </Link>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {formatBytes(doc.sizeBytes)} · {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Coming soon notice */}
        <div className="mt-8 card p-5 border-dashed">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Document upload coming soon</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You'll be able to upload PDFs, images, and other files directly from here.
            Documents can also be attached to specific trips and events.
          </p>
        </div>
      </div>
    </div>
  );
}
