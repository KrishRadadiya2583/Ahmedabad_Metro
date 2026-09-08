const { sectionMap, getEdgeDistance, getLineDistance, lines } = require('../data/stations');
const { formatStation } = require('../utils/stations');

const renderLanding = (res, options = {}) => res.render('index', {
  title: 'Welcome', authError: null, authMode: 'login', values: {}, routeLines: lines, ...options
});

const getHome = (req, res) => req.session?.userId ? res.redirect('/dashboard') : renderLanding(res);

const getPrivacy = (req, res) => res.render('privacy', { title: 'Privacy Policy' });

const getContact = (req, res) => res.render('contact', { title: 'Contact Us' });

const getDashboard = (req, res) => res.redirect('/fare');

const getRoute = (req, res) => res.render('route', {
  title: 'Metro Route', routeLines: lines,
  lineDetails: lines.map(line => ({
    name: line.name, color: line.color, phase: line.phase,
    from: formatStation(line.stations[0]), to: formatStation(line.stations.at(-1)),
    stationCount: line.stations.length, distance: getLineDistance(line.stations),
    segments: line.stations.slice(0, -1).map((station, index) => getEdgeDistance(station, line.stations[index + 1]))
  }))
});

const getNews = (req, res) => res.render('news', {
  title: 'News & Stories',
  newsItems: [
    { date: '18 Jun 2026', tag: 'Project', title: 'Phase 2A approved for airport connectivity', summary: 'The approved 6.032 km corridor will connect Koteshwar Road with Sardar Vallabhbhai Patel International Airport through five stations.', url: 'https://www.gujaratmetrorail.com/gmrc-in-news/cabinet-nod-for-rs-2169-crore-phase-2a-of-ahmedabad-metro-rail-project/' },
    { date: '18 May 2026', tag: 'Service', title: 'Updated Ahmedabad–Gandhinagar timetable', summary: 'GMRC published revised frequency, first and last train, travel-time and timetable information for the combined network.', url: 'https://www.gujaratmetrorail.com/ahmedabad/train-information/' },
    { date: '11 Jan 2026', tag: 'Milestone', title: 'Phase 2 fully commissioned to Mahatma Mandir', summary: 'The final Phase 2 section opened, completing the connection from Ahmedabad through Gandhinagar to Mahatma Mandir.', url: 'https://www.gujaratmetrorail.com/milestones2/' },
    { date: '2026', tag: 'Expansion', title: 'Planning advances for GIFT City and western extensions', summary: 'Consultancy and construction activity covers the GIFT City extension, airport line and the corridor beyond Thaltej Gam.', url: 'https://www.gujaratmetrorail.com/tenders/' }
  ]
});

const getNearestStation = (req, res) => res.render('nearest-station', { title: 'Nearest Station' });

const getTimetable = (req, res) => res.render('timetable', {
  title: 'Metro Timetable',
  timetable: [
    { line: 'Blue Line', route: 'Vastral Gam → Thaltej Gam', first: '06:20', last: '23:00', peak: 'Every 7 min', regular: 'Every 10–20 min', className: 'blue' },
    { line: 'Blue Line', route: 'Thaltej Gam → Vastral Gam', first: '06:20', last: '23:00', peak: 'Every 7 min', regular: 'Every 10–20 min', className: 'blue' },
    { line: 'Red Line', route: 'APMC → Koteshwar Road', first: '06:20', last: '23:10', peak: 'Every 12 min', regular: 'Every 20 min after 22:00', className: 'red' },
    { line: 'Red Line', route: 'Koteshwar Road → APMC', first: '06:16', last: '23:00', peak: 'Every 12 min', regular: 'Every 20 min after 22:00', className: 'red' },
    { line: 'Phase 2', route: 'Koteshwar Road → Mahatma Mandir', first: '06:55', last: '21:20', peak: 'Average 24 min', regular: 'Average 40 min early morning', className: 'yellow' },
    { line: 'Phase 2', route: 'Mahatma Mandir → Koteshwar Road', first: '06:40', last: '21:00', peak: 'Average 24 min', regular: 'Average 40 min early morning', className: 'yellow' },
    { line: 'GIFT Branch', route: 'GNLU → GIFT City', first: '07:36', last: '18:57', peak: 'Average 49–57 min', regular: 'Bus link: 10:18–16:06', className: 'purple' },
    { line: 'GIFT Branch', route: 'GIFT City → GNLU', first: '07:48', last: '19:13', peak: 'Average 49–57 min', regular: 'Bus link: 10:18–16:06', className: 'purple' }
  ]
});

const getSectionById = (req, res) => {
  const section = sectionMap[Number(req.params.id)];
  if (!section) return res.status(404).render('error', { title: 'Section Not Found', message: 'The selected section does not exist.' });
  res.render('section', { title: `Section ${req.params.id}`, section, formattedStations: section.stations.map(formatStation) });
};

module.exports = {
  getHome,
  getPrivacy,
  getContact,
  getDashboard,
  getRoute,
  getNews,
  getNearestStation,
  getTimetable,
  getSectionById
};
