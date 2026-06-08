import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { weatherApi } from '@/services/api/weather.ts';
import { Modal } from '@/shared/components/ui/Modal.tsx';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner.tsx';
import { usePreferences, isImperial } from '@/shared/hooks/usePreferences.ts';
import { weatherVisual, Thermometer } from './weatherVisual.ts';

interface WeatherDetailModalProps {
  tripId: string;
  /** YYYY-MM-DD, or null when closed. */
  date: string | null;
  onClose: () => void;
}

const toF = (c: number) => Math.round((c * 9) / 5 + 32);

export function WeatherDetailModal({ tripId, date, onClose }: WeatherDetailModalProps) {
  const { distanceUnit } = usePreferences();
  const imperial = isImperial(distanceUnit);
  const temp = (c: number) => `${imperial ? toF(c) : c}°`;

  const { data, isLoading } = useQuery({
    queryKey: ['weather-day', tripId, date],
    queryFn: () => weatherApi.getDayDetail(tripId, date!),
    enabled: !!date,
    staleTime: 30 * 60 * 1000,
  });

  const detail = data?.data;
  const granularityLabel =
    detail?.granularity === 'hourly' ? 'Hourly' :
    detail?.granularity === '3-hourly' ? 'Every 3 hours' : '';

  return (
    <Modal
      open={!!date}
      onClose={onClose}
      title="Weather detail"
      description={date ? format(new Date(date), 'EEEE, d MMMM yyyy') : undefined}
    >
      {isLoading ? (
        <div className="py-10 flex justify-center"><LoadingSpinner /></div>
      ) : !detail ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
          Weather isn't available for this day.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Where this is for */}
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-brand-500" />
            <span>Forecast for <strong>{detail.location}</strong></span>
          </div>

          {/* Daily summary */}
          {detail.daily && (
            <div className="card p-4 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40">
              {(() => {
                const d = detail.daily!;
                const Icon = d.isEstimate ? Thermometer : weatherVisual(d.main, d.icon).Icon;
                const color = d.isEstimate ? 'text-slate-400' : weatherVisual(d.main, d.icon).color;
                return <Icon className={`w-8 h-8 ${color}`} />;
              })()}
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {temp(detail.daily.tempMax)} <span className="text-slate-400 dark:text-slate-500 text-base">/ {temp(detail.daily.tempMin)}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {detail.daily.isEstimate ? 'Seasonal estimate' : detail.daily.description}
                </p>
              </div>
            </div>
          )}

          {/* Sub-daily strip */}
          {detail.slices.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{granularityLabel}</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {detail.slices.map((s) => {
                  const { Icon, color } = weatherVisual(s.main, s.icon);
                  return (
                    <div key={s.ts} className="flex flex-col items-center gap-1 flex-shrink-0 w-14 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {format(new Date(s.ts * 1000), imperial ? 'ha' : 'HH:mm')}
                      </span>
                      <Icon className={`w-5 h-5 ${color}`} title={s.description} />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{temp(s.temp)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Detailed hourly conditions become available closer to the date — this far ahead only a
              temperature estimate exists.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
