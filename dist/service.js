import { CONFIG, HTML_MARKERS } from './config';
import { createFlightDataUrl, extractJsonFromHtml, formatDate, generateDates, getNextDayDate, getPreviousDayDate, isOvernightFlight, calculateDuration } from './utils';
/**
 * Transforms raw flight data into the new standardized format
 */
function transformFlightData(flight, type, currentDate) {
    const departureTime = flight.departureTime.time24;
    const arrivalTime = flight.arrivalTime.time24;
    let departureDate = currentDate;
    let arrivalDate = currentDate;
    // Calculate correct dates for overnight flights
    if (type === 'arrivals') {
        if (arrivalTime >= '00:00' && arrivalTime <= '06:00') {
            departureDate = getPreviousDayDate(currentDate);
        }
        else if (arrivalTime >= '22:00' && arrivalTime <= '23:59') {
            departureDate = getPreviousDayDate(currentDate);
            arrivalDate = getPreviousDayDate(currentDate);
        }
    }
    else if (isOvernightFlight(departureTime, arrivalTime)) {
        arrivalDate = getNextDayDate(currentDate);
    }
    const originIata = type === 'departures' ? CONFIG.AIRPORT : flight.airport.fs;
    const destinationIata = type === 'departures' ? flight.airport.fs : CONFIG.AIRPORT;
    const originName = type === 'departures' ? 'Palma de Mallorca' : flight.airport.city;
    const destinationName = type === 'departures' ? flight.airport.city : 'Palma de Mallorca';
    return {
        flight_id: `${flight.carrier.fs}${flight.carrier.flightNumber}_${departureDate}`,
        origin_iata: originIata,
        destination_iata: destinationIata,
        origin_name: originName,
        destination_name: destinationName,
        departure: departureTime,
        arrival: arrivalTime,
        departure_date: departureDate,
        arrival_date: arrivalDate,
        duration: calculateDuration(departureTime, arrivalTime, departureDate !== arrivalDate),
        company: flight.carrier.name,
        company_logo: `https://www.gstatic.com/flights/airline_logos/70px/${flight.carrier.fs}.png`,
        flight: `${flight.carrier.fs}${flight.carrier.flightNumber}`
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
        // Filter out codeshare flights and transform the remaining ones
        return flights
            .filter((flight) => !flight.isCodeshare)
            .map((flight) => transformFlightData(flight, type, currentDate));
    }
    catch (error) {
        console.error(`Error processing data from ${url}:`, error);
        return [];
    }
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
 * Refreshes all flight data and stores in cache
 */
export async function refreshAllFlightData(env) {
    const dates = Array.from(generateDates(CONFIG.DAYS_TO_FETCH));
    const allFlights = [];
    // Fetch both arrivals and departures
    for (const type of ['arrivals', 'departures']) {
        for (const date of dates) {
            const flights = await fetchFlightDataForDate(type, date);
            allFlights.push(...flights);
        }
    }
    // Store all flights in cache
    if (allFlights.length > 0) {
        console.log(`Storing ${allFlights.length} non-codeshare flights in cache`);
        await env.FLIGHTS_KV.put(CONFIG.CACHE.ALL_FLIGHTS_KEY, JSON.stringify(allFlights), { expirationTtl: CONFIG.CACHE.EXPIRATION });
    }
}
/**
 * Gets flights matching the specified criteria
 */
export async function getFlights(origin, destination, date, env) {
    console.log(`Searching flights: ${origin} -> ${destination} on ${date}`);
    // Try to get from cache
    const cached = await env.FLIGHTS_KV.get(CONFIG.CACHE.ALL_FLIGHTS_KEY);
    if (!cached) {
        console.log('Cache miss, refreshing data...');
        await refreshAllFlightData(env);
        return getFlights(origin, destination, date, env);
    }
    const allFlights = JSON.parse(cached);
    console.log(`Total flights in cache: ${allFlights.length}`);
    // Log some sample flights for debugging
    console.log('Sample flight dates:');
    allFlights.slice(0, 3).forEach(f => {
        console.log(`Flight ${f.flight}: ${f.departure_date}, ${f.origin_iata} -> ${f.destination_iata}`);
    });
    // Filter flights based on criteria
    const matchingFlights = allFlights.filter(flight => {
        const matches = flight.origin_iata === origin &&
            flight.destination_iata === destination &&
            flight.departure_date === date;
        if (matches) {
            console.log(`Found matching flight: ${flight.flight}`);
        }
        return matches;
    });
    console.log(`Found ${matchingFlights.length} matching flights`);
    return matchingFlights;
}
