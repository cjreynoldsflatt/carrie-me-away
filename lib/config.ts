// Reference home address used for "distance from home" on each property card.
// Update coordinates if needed (use Google Maps to confirm exact lat/lng).
export const HOME = {
  label: '12213 Mount Albert Rd, Ellicott City',
  lat: 39.2656,
  lng: -76.9456,
}

// ZIP code areas for the search-center dropdown
export const ZIP_AREAS = [
  { zip: '21784', label: 'Sykesville / Eldersburg', lat: 39.400, lng: -76.970 },
  { zip: '21797', label: 'Woodbine',                lat: 39.350, lng: -77.072 },
  { zip: '21794', label: 'West Friendship',          lat: 39.319, lng: -76.949 },
  { zip: '21738', label: 'Glenwood',                 lat: 39.300, lng: -76.940 },
  { zip: '21163', label: 'Woodstock',                lat: 39.319, lng: -76.872 },
  { zip: '21244', label: 'Windsor Mill',             lat: 39.340, lng: -76.771 },
  { zip: '21228', label: 'Catonsville',              lat: 39.272, lng: -76.736 },
  { zip: '21042', label: 'Ellicott City (W)',        lat: 39.278, lng: -76.841 },
  { zip: '21036', label: 'Dayton',                   lat: 39.266, lng: -76.953 },
  { zip: '21029', label: 'Clarksville',              lat: 39.193, lng: -76.909 },
  { zip: '21044', label: 'Columbia (W)',             lat: 39.222, lng: -76.882 },
  { zip: '21045', label: 'Columbia (E)',             lat: 39.221, lng: -76.856 },
  { zip: '21046', label: 'Columbia (N)',             lat: 39.197, lng: -76.831 },
  { zip: '21075', label: 'Elkridge',                 lat: 39.212, lng: -76.759 },
  { zip: '20794', label: 'Jessup',                   lat: 39.147, lng: -76.775 },
  { zip: '20777', label: 'Highland',                 lat: 39.183, lng: -76.951 },
  { zip: '20833', label: 'Brookeville',              lat: 39.178, lng: -77.060 },
  { zip: '20832', label: 'Olney',                    lat: 39.154, lng: -77.067 },
  { zip: '20860', label: 'Sandy Spring',             lat: 39.130, lng: -77.001 },
] as const
