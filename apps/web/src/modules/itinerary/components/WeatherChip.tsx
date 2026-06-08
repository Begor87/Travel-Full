import { cn } from '@/shared/utils/cn.ts';
import { usePreferences, isImperial } from '@/shared/hooks/usePreferences.ts';
import { weatherVisual, Thermometer } from './weatherVisual.ts';
import type { DailyForecast } from '@/services/api/weather.ts';

interface WeatherChipProps {
  forecast: DailyForecast;
  className?: string;
  onClick?: () => void;
}

const toF = (c: number) => Math.round((c * 9) / 5 + 32);

export function WeatherChip({ forecast, className, onClick }: WeatherChipProps) {
  const { distanceUnit } = usePreferences();
  const imperial = isImperial(distanceUnit);
  const hi = imperial ? toF(forecast.tempMax) : forecast.tempMax;
  const lo = imperial ? toF(forecast.tempMin) : forecast.tempMin;

  const Icon = forecast.isEstimate ? Thermometer : weatherVisual(forecast.main, forecast.icon).Icon;
  const color = forecast.isEstimate ? 'text-slate-400' : weatherVisual(forecast.main, forecast.icon).color;

  // Tooltip makes it clear WHERE this forecast is for, plus the conditions.
  const place = forecast.location ?? 'this day';
  const cond = forecast.isEstimate ? 'seasonal estimate (temperature only)' : forecast.description;
  const title = `Weather for ${place} — ${cond}. Click for details.`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60',
        'hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors',
        className,
      )}
      title={title}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {forecast.isEstimate && <span className="text-slate-400 dark:text-slate-500">~</span>}
        {hi}°
        <span className="text-slate-400 dark:text-slate-500"> / {lo}°</span>
      </span>
    </button>
  );
}
