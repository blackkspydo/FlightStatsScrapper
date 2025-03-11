export interface FlightData {
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    city: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    city: string;
    time: string;
    date: string;
  };
  operatedBy: string | null;
  isCodeshare: boolean;
}

export interface ApiResponse {
  totalFlights: number;
  flights: FlightData[];
}

export interface ErrorResponse {
  error: string;
}

export type FlightType = 'departures' | 'arrivals';

export interface Env {
  FLIGHTS_KV: KVNamespace;
}