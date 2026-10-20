export interface SiteRef {
  id: string;
  code: string;
  latitude: number;
  longitude: number;
}

export interface ForecastPoint {
  at: Date;
  precipitationMmH: number;
  temperatureC: number | null;
}

export interface ForecastRange {
  start: Date;
  end: Date;
}

export interface WeatherProvider {
  getForecast(site: SiteRef, range: ForecastRange): Promise<ForecastPoint[]>;
}
