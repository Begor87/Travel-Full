import { Sun, Cloud, CloudSun, CloudRain, CloudDrizzle, CloudLightning, CloudSnow, CloudFog, Thermometer } from 'lucide-react';

/** Maps an OpenWeatherMap condition to a lucide icon + accent colour. */
export function weatherVisual(main: string, icon: string): { Icon: React.ElementType; color: string } {
  switch (main) {
    case 'Clear':        return { Icon: Sun, color: 'text-amber-500' };
    case 'Clouds':       return icon.startsWith('02')
      ? { Icon: CloudSun, color: 'text-slate-400' }
      : { Icon: Cloud, color: 'text-slate-400' };
    case 'Rain':         return { Icon: CloudRain, color: 'text-blue-500' };
    case 'Drizzle':      return { Icon: CloudDrizzle, color: 'text-blue-400' };
    case 'Thunderstorm': return { Icon: CloudLightning, color: 'text-violet-500' };
    case 'Snow':         return { Icon: CloudSnow, color: 'text-sky-300' };
    default:             return { Icon: CloudFog, color: 'text-slate-400' };
  }
}

export { Thermometer };
