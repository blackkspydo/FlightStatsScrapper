export interface Flight {
  flight_id: string;
  origin_iata: string;
  destination_iata: string;
  origin_name: string;
  destination_name: string;
  departure: string;
  arrival: string;
  departure_date: string;
  arrival_date: string;
  duration: number;
  company: string;
  company_logo: string;
  flight: string;
}

export interface ApiResponse {
  totalFlights: number;
  flights: Flight[];
}

export interface ErrorResponse {
  error: string;
}

export type FlightType = 'departures' | 'arrivals';

export interface Env {
  FLIGHTS_KV: KVNamespace;
}

// Internal types for data processing
export interface RawFlightData {
  carrier: {
    fs: string;
    name: string;
    flightNumber: string;
  };
  departureTime: {
    time24: string;
  };
  arrivalTime: {
    time24: string;
  };
  airport: {
    fs: string;
    city: string;
  };
  operatedBy: string | null;
  isCodeshare: boolean;
}