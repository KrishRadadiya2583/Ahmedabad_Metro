(() => {
  const mapElement = document.getElementById('actual-route-map');
  if (!mapElement || typeof L === 'undefined') return;

  const status = document.getElementById('actual-map-status');
  const map = L.map(mapElement, { zoomControl: true }).setView([23.115, 72.615], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);

  const networkLayer = L.featureGroup().addTo(map);
  const bounds = '22.95,72.43,23.35,72.78';
  const query = `[out:json][timeout:30];(
    relation["route"~"subway|light_rail"](${bounds});
    way["railway"~"subway|light_rail"](${bounds});
    node["railway"="station"]["station"~"subway|light_rail"](${bounds});
    node["railway"~"station|halt"]["network"~"Ahmedabad|Gujarat Metro|GMRC",i](${bounds});
  );out body geom;`;

  const lineColor = tags => {
    const text = `${tags?.name || ''} ${tags?.ref || ''}`.toLowerCase();
    if (text.includes('east') || text.includes('blue')) return '#1558d6';
    if (text.includes('north') || text.includes('red')) return '#cc3544';
    if (text.includes('gift') || text.includes('violet')) return '#7651c9';
    if (tags?.colour && /^#[0-9a-f]{6}$/i.test(tags.colour)) return tags.colour;
    return '#d5a514';
  };

  const addTrack = (geometry, tags = {}) => {
    if (!geometry?.length) return;
    const points = geometry.filter(point => point.lat != null && point.lon != null).map(point => [point.lat, point.lon]);
    if (points.length > 1) L.polyline(points, { color: lineColor(tags), weight: 6, opacity: .88, lineCap: 'round' }).bindPopup(`<strong>${tags.name || 'Ahmedabad Metro track'}</strong>`).addTo(networkLayer);
  };

  fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
    .then(response => {
      if (!response.ok) throw new Error('Map data service is temporarily unavailable.');
      return response.json();
    })
    .then(data => {
      let tracks = 0;
      let stations = 0;
      data.elements.forEach(element => {
        if (element.type === 'relation') {
          element.members?.forEach(member => { if (member.geometry) { addTrack(member.geometry, element.tags); tracks += 1; } });
        } else if (element.type === 'way' && element.geometry) {
          addTrack(element.geometry, element.tags); tracks += 1;
        } else if (element.type === 'node' && element.lat != null && element.lon != null) {
          const name = element.tags?.name || 'Metro station';
          L.circleMarker([element.lat, element.lon], { radius: 6, color: '#102441', weight: 3, fillColor: '#fff', fillOpacity: 1 })
            .bindPopup(`<strong>${name}</strong><br>Ahmedabad Metro station`)
            .bindTooltip(name, { direction: 'top' }).addTo(networkLayer);
          stations += 1;
        }
      });
      mapElement.querySelector('.actual-map-loading')?.remove();
      if (networkLayer.getLayers().length) map.fitBounds(networkLayer.getBounds(), { padding: [25, 25] });
      status.textContent = `${stations} mapped stations · ${tracks} track sections loaded`;
    })
    .catch(error => {
      mapElement.querySelector('.actual-map-loading')?.remove();
      status.textContent = error.message;
    });

  document.getElementById('fit-actual-route')?.addEventListener('click', () => {
    if (networkLayer.getLayers().length) map.fitBounds(networkLayer.getBounds(), { padding: [25, 25] });
    else map.setView([23.115, 72.615], 11);
  });
})();
