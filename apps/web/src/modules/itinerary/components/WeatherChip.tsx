import { Sun, Cloud, CloudSun, CloudRain, CloudDrizzle, CloudLightning, CloudSnow, CloudFog } from 'lucide-react';
import { cn } from '@/shared/utils/cn.ts';
import { usePreferences, isImperial } from '@/shared/hooks/usePreferences.ts';
import type { DailyForecast } from '@/services/api/weather.ts';

/** Maps an OpenWeatherMap condition to a lucide icon + accent colour. */
function weatherVisual(main: string, icon: string): { Icon: React.ElementType; color: string } {
  switch (main) {
    case 'Clear':
      return { Icon: Sun, color: 'text-amber-500' };
    case 'Clouds':
      // 02 = few clouds → sun peeking; others → full cloud
      return icon.startsWith('02')
        ? { Icon: CloudSun, color: 'text-slate-400' }
        : { Icon: Cloud, color: 'text-slate-400' };
    case 'Rain':
      return { Icon: CloudRain, color: 'text-blue-500' };
    case 'Drizzle':
      return { Icon: CloudDrizzle, color: 'text-blue-400' };
    case 'Thunderstorm':
      return { Icon: CloudLightning, color: 'text-violet-500' };
    case 'Snow':
      return { Icon: CloudSnow, color: 'text-sky-300' };
    default:
      // Mist, Fog, Haze, Smoke, etc.
      return { Icon: CloudFog, color: 'text-slate-400' };
  }
}

interface WeatherChipProps {
  forecast: DailyForecast;
  className?: string;
}

const toF = (c: number) => Math.round((c * 9) / 5 + 32);

export function WeatherChip({ forecast, className }: WeatherChipProps) {
  const { distanceUnit } = usePreferences();
  const imperial = isImperial(distanceUnit);
  const { Icon, color } = weatherVisual(forecast.main, forecast.icon);
  const hi = imperial ? toF(forecast.tempMax) : forecast.tempMax;
  const lo = imperial ? toF(forecast.tempMin) : forecast.tempMin;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60',
        className,
      )}
      title={forecast.description.replace(/^\w/, (c) => c.toUpperCase())}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {hi}°
        <span className="text-slate-400 dark:text-slate-500"> / {lo}°</span>
      </span>
    </div>
  );
}
