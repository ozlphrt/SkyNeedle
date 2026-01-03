export type Airport = {
  iata: string; // 3-letter
  icao: string; // 4-letter
  name: string;
  city: string;
  latDeg: number;
  lonDeg: number;
  altM: number;
  isLarge: boolean;
};

export type City = {
  name: string;
  latDeg: number;
  lonDeg: number;
};

// Tiny hardcoded dataset (Phase 4.2 baby step).
export const AIRPORTS: Airport[] = [
  {
    iata: "JFK",
    icao: "KJFK",
    name: "John F. Kennedy International",
    city: "New York",
    latDeg: 40.6413,
    lonDeg: -73.7781,
    altM: 4,
    isLarge: true
  },
  {
    iata: "LGA",
    icao: "KLGA",
    name: "LaGuardia",
    city: "New York",
    latDeg: 40.7769,
    lonDeg: -73.874,
    altM: 6,
    isLarge: true
  },
  {
    iata: "EWR",
    icao: "KEWR",
    name: "Newark Liberty International",
    city: "Newark",
    latDeg: 40.6895,
    lonDeg: -74.1745,
    altM: 5,
    isLarge: true
  },
  {
    iata: "LAX",
    icao: "KLAX",
    name: "Los Angeles International",
    city: "Los Angeles",
    latDeg: 33.9416,
    lonDeg: -118.4085,
    altM: 38,
    isLarge: true
  },
  {
    iata: "SFO",
    icao: "KSFO",
    name: "San Francisco International",
    city: "San Francisco",
    latDeg: 37.6213,
    lonDeg: -122.379,
    altM: 4,
    isLarge: true
  },
  {
    iata: "ORD",
    icao: "KORD",
    name: "O'Hare International",
    city: "Chicago",
    latDeg: 41.9742,
    lonDeg: -87.9073,
    altM: 204,
    isLarge: true
  },
  {
    iata: "ATL",
    icao: "KATL",
    name: "Hartsfield–Jackson Atlanta International",
    city: "Atlanta",
    latDeg: 33.6407,
    lonDeg: -84.4277,
    altM: 313,
    isLarge: true
  }
];

export const CITIES: City[] = [
  { name: "New York", latDeg: 40.7128, lonDeg: -74.006 },
  { name: "Los Angeles", latDeg: 34.0522, lonDeg: -118.2437 },
  { name: "San Francisco", latDeg: 37.7749, lonDeg: -122.4194 },
  { name: "Chicago", latDeg: 41.8781, lonDeg: -87.6298 },
  { name: "Atlanta", latDeg: 33.749, lonDeg: -84.388 }
];


