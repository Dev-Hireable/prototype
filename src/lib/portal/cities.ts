/**
 * TB-127 — the places a company can say it's based, as "City, Country". A location is picked from
 * this list rather than typed, so every company reads the same way and can be matched by place.
 * Remote is a separate yes/no on the company, not part of the location.
 */
const BY_COUNTRY: Record<string, string[]> = {
  Argentina: ["Buenos Aires", "Córdoba"],
  Australia: ["Adelaide", "Brisbane", "Melbourne", "Perth", "Sydney"],
  Austria: ["Vienna"],
  Belgium: ["Brussels"],
  Brazil: ["Rio de Janeiro", "São Paulo"],
  Canada: ["Calgary", "Montreal", "Toronto", "Vancouver"],
  Chile: ["Santiago"],
  China: ["Beijing", "Shanghai", "Shenzhen"],
  Colombia: ["Bogotá", "Medellín"],
  "Czech Republic": ["Prague"],
  Denmark: ["Copenhagen"],
  Egypt: ["Cairo"],
  Finland: ["Helsinki"],
  France: ["Lyon", "Paris"],
  Germany: ["Berlin", "Frankfurt", "Hamburg", "Munich"],
  Ghana: ["Accra"],
  "Hong Kong": ["Hong Kong"],
  India: ["Bengaluru", "Chennai", "Delhi", "Hyderabad", "Mumbai", "Pune"],
  Indonesia: ["Jakarta"],
  Ireland: ["Dublin"],
  Israel: ["Tel Aviv"],
  Italy: ["Milan", "Rome"],
  Japan: ["Osaka", "Tokyo"],
  Kenya: ["Mombasa", "Nairobi"],
  Malaysia: ["Kuala Lumpur"],
  Mexico: ["Guadalajara", "Mexico City", "Monterrey"],
  Netherlands: ["Amsterdam", "Rotterdam"],
  "New Zealand": ["Auckland", "Wellington"],
  Nigeria: ["Abuja", "Lagos"],
  Norway: ["Oslo"],
  Pakistan: ["Karachi", "Lahore"],
  Peru: ["Lima"],
  Philippines: ["Baguio", "Cebu", "Davao", "Iloilo", "Makati", "Manila", "Pasig", "Quezon City", "Taguig"],
  Poland: ["Kraków", "Warsaw"],
  Portugal: ["Lisbon", "Porto"],
  Qatar: ["Doha"],
  Romania: ["Bucharest"],
  "Saudi Arabia": ["Riyadh"],
  Singapore: ["Singapore"],
  "South Africa": ["Cape Town", "Johannesburg"],
  "South Korea": ["Seoul"],
  Spain: ["Barcelona", "Madrid", "Valencia"],
  Sweden: ["Stockholm"],
  Switzerland: ["Geneva", "Zurich"],
  Taiwan: ["Taipei"],
  Thailand: ["Bangkok"],
  Turkey: ["Istanbul"],
  "United Arab Emirates": ["Abu Dhabi", "Dubai"],
  UK: ["Birmingham", "Edinburgh", "London", "Manchester"],
  USA: ["Atlanta", "Austin", "Boston", "Chicago", "Dallas", "Denver", "Houston", "Los Angeles", "Miami", "New York", "San Francisco", "Seattle", "Washington, D.C."],
  Vietnam: ["Hanoi", "Ho Chi Minh City"],
};

/** Every city, as "City, Country", sorted. */
export const CITIES: readonly string[] = Object.entries(BY_COUNTRY)
  .flatMap(([country, cities]) => cities.map((city) => `${city}, ${country}`))
  .sort((a, b) => a.localeCompare(b));
