import { CONFIG, HTML_MARKERS } from './config';
import { createFlightDataUrl, extractJsonFromHtml, formatDate, generateDates, getNextDayDate, getPreviousDayDate, isOvernightFlight } from './utils';
/**
 * Determines the correct dates for departure and arrival based on flight times
 */
function calculateFlightDates(type, currentDate, departureTime, arrivalTime) {
    if (type === 'arrivals') {
        // For arrivals between 00:00-06:00, the departure was the previous day
        if (arrivalTime >= '00:00' && arrivalTime <= '06:00') {
            return {
                departureDate: getPreviousDayDate(currentDate),
                arrivalDate: currentDate
            };
        }
        // For arrivals between 22:00-23:59, both departure and arrival were the previous day
        if (arrivalTime >= '22:00' && arrivalTime <= '23:59') {
            const previousDay = getPreviousDayDate(currentDate);
            return {
                departureDate: previousDay,
                arrivalDate: previousDay
            };
        }
        // Same day flight
        return {
            departureDate: currentDate,
            arrivalDate: currentDate
        };
    }
    else {
        // For departures
        if (isOvernightFlight(departureTime, arrivalTime)) {
            return {
                departureDate: currentDate,
                arrivalDate: getNextDayDate(currentDate)
            };
        }
        // Same day flight
        return {
            departureDate: currentDate,
            arrivalDate: currentDate
        };
    }
}
/**
 * Transforms raw flight data into a standardized format
 */
function transformFlightData(flight, type, currentDate) {
    const departureTime = flight.departureTime.time24;
    const arrivalTime = flight.arrivalTime.time24;
    const { departureDate, arrivalDate } = calculateFlightDates(type, currentDate, departureTime, arrivalTime);
    return {
        flightNumber: `${flight.carrier.fs}${flight.carrier.flightNumber}`,
        airline: flight.carrier.name,
        departure: {
            airport: type === 'departures' ? CONFIG.AIRPORT : flight.airport.fs,
            city: type === 'departures' ? 'Palma de Mallorca' : flight.airport.city,
            time: departureTime,
            date: departureDate,
        },
        arrival: {
            airport: type === 'departures' ? flight.airport.fs : CONFIG.AIRPORT,
            city: type === 'departures' ? flight.airport.city : 'Palma de Mallorca',
            time: arrivalTime,
            date: arrivalDate,
        },
        operatedBy: flight.operatedBy || null,
        isCodeshare: flight.isCodeshare || false
    };
}
/**
 * Fetches flight data for a specific date and time slot
 */
async function fetchFlightDataForTimeSlot(type, date, hour) {
    const url = createFlightDataUrl(CONFIG.BASE_URL, type, CONFIG.AIRPORT, date, hour);
    const response = await fetch(url, {
        headers: CONFIG.HEADERS
    });
    if (!response.ok) {
        console.error(`HTTP error! status: ${response.status} for URL: ${url}`);
        return [];
    }
    const html = await response.text();
    try {
        const data = extractJsonFromHtml(html, HTML_MARKERS.START, HTML_MARKERS.END);
        const flights = data.props.initialState.flightTracker.route.flights;
        const currentDate = formatDate(date);
        return flights.map((flight) => transformFlightData(flight, type, currentDate));
    }
    catch (error) {
        console.error(`Error processing data from ${url}:`, error);
        return [];
    }
}
/**
 * Creates a cache key for flight data
 */
function createCacheKey(type, date) {
    return `flights:${type}:${date}`;
}
/**
 * Fetches all flight data for a specific date concurrently
 */
async function fetchFlightDataForDate(type, date) {
    const fetchPromises = CONFIG.TIME_SLOTS.map(hour => fetchFlightDataForTimeSlot(type, date, hour));
    const results = await Promise.all(fetchPromises);
    return results.flat();
}
/**
 * Fetches all flight data for the specified type (departures or arrivals)
 * Uses concurrent requests and caching for optimization
 */
export async function fetchAllFlightData(type, env) {
    const dates = Array.from(generateDates(CONFIG.DAYS_TO_FETCH));
    const allFlights = [];
    // Process dates in parallel
    const fetchPromises = dates.map(async (date) => {
        const dateStr = formatDate(date);
        const cacheKey = createCacheKey(type, dateStr);
        // Try to get from cache first
        if (env?.FLIGHTS_KV) {
            const cached = await env.FLIGHTS_KV.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        // If not in cache, fetch and store
        const flights = await fetchFlightDataForDate(type, date);
        if (env?.FLIGHTS_KV && flights.length > 0) {
            // Cache for 5 minutes
            await env.FLIGHTS_KV.put(cacheKey, JSON.stringify(flights), { expirationTtl: 300 });
        }
        return flights;
    });
    const results = await Promise.all(fetchPromises);
    return results.flat();
}
