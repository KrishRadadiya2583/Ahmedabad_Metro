// Station coordinates bundled from OpenStreetMap so nearest-station lookup does
// not depend on the availability or rate limits of a public Overpass server.
const locations = [
  ['Vastral Gam',22.9971397,72.667391],['Nirant Cross Roads',22.9997169,72.658889],
  ['Vastral',23.0035988,72.6475942],['Rabari Colony',23.0054703,72.6354063],
  ['Amraiwadi',23.0076672,72.6287279],['Apparel Park',23.0106696,72.6180098],
  ['Kankaria East',23.0154573,72.6070016],['Kalupur Railway Station',23.0246913,72.6031447],
  ['Gheekanta',23.028794,72.5867752],['Shahpur Station',23.0392105,72.5810327],
  ['Old High Court',23.0372892,72.5672065],['Stadium',23.0398414,72.5616768],
  ['Commerce Sixth Road',23.0407013,72.552973],['Gujarat University Station',23.0448477,72.5435296],
  ['Gurukul Road',23.0458829,72.5348734],['Doordarshan Kendra',23.0481764,72.5244209],
  ['Thaltej',23.049748,72.5160152],['Thaltej Gam',23.0502062,72.5070123],
  ['APMC',22.9977445,72.5371222],['Jivraj Park',23.0054989,72.5334928],
  ['Rajiv Nagar',23.0097229,72.5367523],['Shreyas',23.0135977,72.5492225],
  ['Paldi',23.0185053,72.5624076],['Gandhigram',23.0270955,72.5690238],
  ['Usmanpura',23.0458371,72.564982],['Vijay Nagar',23.0561913,72.5623389],
  ['Vadaj',23.0676671,72.5657588],['Ranip',23.0676741,72.5740838],
  ['AEC',23.0751088,72.593291],['Sabarmati',23.0856303,72.592206],
  ['Motera Stadium',23.0967726,72.596692],['Koteshwar Road',23.1031114,72.6021329],
  ['Vishwakarma College',23.1141999,72.6083864],['Tapovan Circle',23.1201271,72.6157987],
  ['Narmada Canal',23.1251457,72.6220979],['Koba Circle',23.1322508,72.631042],
  ['Juna Koba',23.1419718,72.6386122],['Koba Gam',23.1476098,72.6439055],
  ['GNLU',23.1544724,72.6474689],['Raysan',23.1663954,72.6483252],
  ['Randesan',23.1790845,72.6472905],['Dholakuva Circle',23.1859445,72.6433202],
  ['Infocity',23.1922574,72.6397126],['Sector-1',23.2049077,72.6431519],
  ['Sector-10A',23.2114841,72.6501927],['Sachivalaya',23.2150688,72.6587511],
  ['Akshardham',23.2236772,72.6641817],['Juna Sachivalaya',23.228926,72.6594151],
  ['Sector-16',23.2338826,72.6501659],['Sector-24',23.2385075,72.6414782],
  ['Mahatma Mandir',23.2339412,72.6338714],['PDEU',23.1548645,72.6612117],
  ['GIFT City',23.1533555,72.6855536]
];

module.exports = locations.map(([name, lat, lon], id) => ({
  type: 'node', id, lat, lon,
  tags: { name, network: 'Ahmedabad Metro', station: 'subway' }
}));
