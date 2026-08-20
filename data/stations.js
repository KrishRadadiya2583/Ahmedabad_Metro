const metro1 = ['VASTRAL_GAM','NIRANT_CROSS_ROAD','VASTRAL','RABARI_COLONY','AMRAIWADI','APPAREL_PARK','KANKARIA_EAST','KALUPUR_RAILWAY_STATION','GHEE_KANTA','SHAHPUR','OLD_HIGHCOURT','STADIUM','COMMERCE_SIX_ROADS','GUJARAT_UNIVERSITY','GURUKUL_ROAD','DOORDARSHAN_KENDRA','THALTEJ','THALTEJ_GAM'];
const metro2 = ['APMC','JIVRAJ_PARK','RAJIV_NAGAR','SHREYAS','PALDI','GANDHIGRAM','OLD_HIGHCOURT','USMANPURA','VIJAY_NAGAR','VADAJ','RANIP','SABARMATI_RAILWAY_STATION','AEC','SABARMATI','MOTERA_STADIUM'];
const phase2Main = ['MOTERA_STADIUM','KOTESHWAR_ROAD','VISHWAKARMA_COLLEGE','TAPOVAN_CIRCLE','NARMADA_CANAL','KOBA_CIRCLE','JUNA_KOBA','KOBA_GAAM','GNLU','RAYSAN','RANDESAN','DHOLAKUVA_CIRCLE','INFOCITY','SECTOR_1','SECTOR_10A','SACHIVALAYA','AKSHARDHAM','JUNA_SACHIVALAYA','SECTOR_16','SECTOR_24','MAHATMA_MANDIR'];
const giftBranch = ['GNLU','PDEU','GIFT_CITY'];

const lines = [
  { name: 'Blue Line · East–West', color: 'blue', phase: 'Phase 1', stations: metro1 },
  { name: 'Red Line · North–South', color: 'red', phase: 'Phase 1', stations: metro2 },
  { name: 'Violet Line · Motera–Mahatma Mandir', color: 'violet', phase: 'Phase 2', stations: phase2Main },
  { name: 'GIFT City Branch', color: 'green', phase: 'Phase 2', stations: giftBranch }
];

const sectionMap = Object.fromEntries(lines.map((line, index) => [index + 1, { title: line.name, stations: line.stations }]));
const normalizeStation = (value = '') => String(value).trim().toUpperCase().replace(/[\s-]+/g, '_');
const allStations = [...new Set(lines.flatMap(line => line.stations))];
const isInArray = (arr, station) => arr.some(item => normalizeStation(item) === normalizeStation(station));
const findIndex = (arr, station) => arr.findIndex(item => normalizeStation(item) === normalizeStation(station));

// Approximate track distance in kilometres between consecutive Phase 1 stations.
// Store each edge once; getEdgeDistance supports travel in either direction.
const edgeDistances = new Map([
  ['VASTRAL_GAM|NIRANT_CROSS_ROAD', 1.1],
  ['NIRANT_CROSS_ROAD|VASTRAL', 0.8],
  ['VASTRAL|RABARI_COLONY', 1.4],
  ['RABARI_COLONY|AMRAIWADI', 1.0],
  ['AMRAIWADI|APPAREL_PARK', 0.8],
  ['APPAREL_PARK|KANKARIA_EAST', 1.3],
  ['KANKARIA_EAST|KALUPUR_RAILWAY_STATION', 1.3],
  ['KALUPUR_RAILWAY_STATION|GHEE_KANTA', 1.3],
  ['GHEE_KANTA|SHAHPUR', 1.3],
  ['SHAHPUR|OLD_HIGHCOURT', 1.3],
  ['OLD_HIGHCOURT|STADIUM', 1.3],
  ['STADIUM|COMMERCE_SIX_ROADS', 1.3],
  ['COMMERCE_SIX_ROADS|GUJARAT_UNIVERSITY', 1.3],
  ['GUJARAT_UNIVERSITY|GURUKUL_ROAD', 1.3],
  ['GURUKUL_ROAD|DOORDARSHAN_KENDRA', 1.3],
  ['DOORDARSHAN_KENDRA|THALTEJ', 1.3],
  ['THALTEJ|THALTEJ_GAM', 1.43],
  ['APMC|JIVRAJ_PARK', 1.35],
  ['JIVRAJ_PARK|RAJIV_NAGAR', 1.35],
  ['RAJIV_NAGAR|SHREYAS', 1.35],
  ['SHREYAS|PALDI', 1.35],
  ['PALDI|GANDHIGRAM', 1.35],
  ['GANDHIGRAM|OLD_HIGHCOURT', 1.35],
  ['OLD_HIGHCOURT|USMANPURA', 1.35],
  ['USMANPURA|VIJAY_NAGAR', 1.34],
  ['VIJAY_NAGAR|VADAJ', 1.35],
  ['VADAJ|RANIP', 1.35],
  ['RANIP|SABARMATI_RAILWAY_STATION', 1.35],
  ['SABARMATI_RAILWAY_STATION|AEC', 1.35],
  ['AEC|SABARMATI', 1.35],
  ['SABARMATI|MOTERA_STADIUM', 1.35],
  // Phase 2 distances from the GMRC DPR station chainages.
  ['MOTERA_STADIUM|KOTESHWAR_ROAD', 0.9371],
  ['KOTESHWAR_ROAD|VISHWAKARMA_COLLEGE', 1.4182],
  ['VISHWAKARMA_COLLEGE|TAPOVAN_CIRCLE', 0.9774],
  ['TAPOVAN_CIRCLE|NARMADA_CANAL', 0.9056],
  ['NARMADA_CANAL|KOBA_CIRCLE', 1.1506],
  ['KOBA_CIRCLE|JUNA_KOBA', 1.0058],
  ['JUNA_KOBA|KOBA_GAAM', 1.01],
  ['KOBA_GAAM|GNLU', 0.9111],
  ['GNLU|RAYSAN', 1.4362],
  ['RAYSAN|RANDESAN', 1.3732],
  ['RANDESAN|DHOLAKUVA_CIRCLE', 1.1563],
  ['DHOLAKUVA_CIRCLE|INFOCITY', 1.3908],
  ['INFOCITY|SECTOR_1', 1.266],
  ['SECTOR_1|SECTOR_10A', 1.25],
  ['SECTOR_10A|SACHIVALAYA', 1.1913],
  ['SACHIVALAYA|AKSHARDHAM', 1.1287],
  ['AKSHARDHAM|JUNA_SACHIVALAYA', 0.899],
  ['JUNA_SACHIVALAYA|SECTOR_16', 1.0923],
  ['SECTOR_16|SECTOR_24', 1.0377],
  ['SECTOR_24|MAHATMA_MANDIR', 1.2006],
  ['GNLU|PDEU', 1.749],
  ['PDEU|GIFT_CITY', 2.85686]
]);

const getEdgeDistance = (from, to) => edgeDistances.get(`${from}|${to}`) ?? edgeDistances.get(`${to}|${from}`);
const getLineDistance = stations => Number(stations.slice(0, -1).reduce((total, station, index) => total + (getEdgeDistance(station, stations[index + 1]) || 0), 0).toFixed(2));

const graph = new Map(allStations.map(station => [station, new Set()]));
for (const line of lines) {
  line.stations.forEach((station, index) => {
    if (index > 0) { graph.get(station).add(line.stations[index - 1]); graph.get(line.stations[index - 1]).add(station); }
  });
}

const findJourney = (startStation, endStation) => {
  const start = normalizeStation(startStation), end = normalizeStation(endStation);
  if (!graph.has(start) || !graph.has(end)) return null;
  if (start === end) return [start];
  const queue = [[start]], visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift(), current = path[path.length - 1];
    for (const next of graph.get(current)) {
      if (visited.has(next)) continue;
      const nextPath = [...path, next];
      if (next === end) return nextPath;
      visited.add(next); queue.push(nextPath);
    }
  }
  return null;
};

const getJourneyDetails = (startStation, endStation) => {
  const journey = findJourney(startStation, endStation);
  if (!journey || journey.length < 2) return { journey: journey || [], interchanges: [], linesUsed: [] };
  const edgeLines = journey.slice(0, -1).map((station, index) => lines.find(line => {
    const a = line.stations.indexOf(station), b = line.stations.indexOf(journey[index + 1]);
    return a !== -1 && b !== -1 && Math.abs(a - b) === 1;
  }));
  const interchanges = [];
  edgeLines.forEach((line, index) => {
    if (index > 0 && line?.name !== edgeLines[index - 1]?.name) interchanges.push({ station: journey[index], fromLine: edgeLines[index - 1]?.name, toLine: line?.name });
  });
  return { journey, interchanges, linesUsed: [...new Set(edgeLines.filter(Boolean).map(line => line.name))] };
};

const computeDistance = (startStation, endStation) => {
  const journey = findJourney(startStation, endStation);
  if (!journey) return -1;
  let distance = 0;
  for (let index = 0; index < journey.length - 1; index += 1) {
    const edgeDistance = getEdgeDistance(journey[index], journey[index + 1]);
    if (edgeDistance == null) return null;
    distance += edgeDistance;
  }
  return Number(distance.toFixed(2));
};

const calculateFare = (startStation, endStation) => {
  const journey = findJourney(startStation, endStation);
  if (!journey) return { valid: false, message: 'One or both stations are not valid.' };
  const stops = journey.length - 1;
  if (!stops) return { valid: false, message: 'Origin and destination must be different.' };
  const distance = computeDistance(startStation, endStation);
  if (distance == null) return { valid: false, message: 'Distance data is not available for every station on this route yet.' };
  const basePrice = Math.min(40, 5 * Math.ceil(stops / 4));
  const details = getJourneyDetails(startStation, endStation);
  return { valid: true, stops, distance, basePrice, totalPrice: basePrice, discountApplied: false, ticketValidMinutes: 180, ...details };
};

module.exports = { metro1, metro2, phase2Main, giftBranch, lines, allStations, sectionMap, normalizeStation, isInArray, findIndex, findJourney, getJourneyDetails, getEdgeDistance, getLineDistance, computeDistance, calculateFare };
