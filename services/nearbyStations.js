const toRadians = value => value * Math.PI / 180;

const distanceInKm = (fromLatitude, fromLongitude, toLatitude, toLongitude) => {
  const earthRadiusKm = 6371.0088;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(fromLatitude)) * Math.cos(toRadians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const firstValue = (...values) => values.find(value => typeof value === 'string' && value.trim())?.trim();

const stationLocation = tags => {
  const address = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return firstValue(
    tags['addr:full'],
    [address, tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', '),
    tags['addr:suburb'], tags.suburb, tags.locality, tags['addr:city'], tags.city,
    'Ahmedabad Metro network'
  );
};

const isAhmedabadMetroStation = tags => {
  const identity = [tags.network, tags.operator, tags.brand, tags.description].filter(Boolean).join(' ');
  return /ahmedabad metro|gujarat metro|gmrc/i.test(identity)
    || /subway|light_rail/.test(String(tags.station || '').toLowerCase());
};

const normalizeNearbyStations = (elements, latitude, longitude, limit = 5) => {
  const stations = new Map();

  for (const element of Array.isArray(elements) ? elements : []) {
    const tags = element.tags || {};
    const name = firstValue(tags['name:en'], tags.name);
    const stationLatitude = Number(element.lat ?? element.center?.lat);
    const stationLongitude = Number(element.lon ?? element.center?.lon);
    if (!name || !Number.isFinite(stationLatitude) || !Number.isFinite(stationLongitude) || !isAhmedabadMetroStation(tags)) continue;

    const station = {
      name,
      location: stationLocation(tags),
      latitude: stationLatitude,
      longitude: stationLongitude,
      distanceKm: Number(distanceInKm(latitude, longitude, stationLatitude, stationLongitude).toFixed(2))
    };
    const key = name.toLocaleLowerCase('en-IN').replace(/[^a-z0-9]/g, '');
    const existing = stations.get(key);
    if (!existing || station.distanceKm < existing.distanceKm) stations.set(key, station);
  }

  return [...stations.values()].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
};

module.exports = { distanceInKm, normalizeNearbyStations };
