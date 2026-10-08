// Jurisdictions with extra rental rules (licensing, registration, inspections), drawn on the map
// and flagged on listings inside them. Boundaries come from OpenStreetMap (simplified to ~30 m);
// add an entry here (plus its GeoJSON file) to cover more areas.
import type { Polygon, MultiPolygon, Position } from 'geojson'
import frederickCity from './frederick-city.json'
import howardCounty from './howard-county.json'
import montgomeryCounty from './montgomery-county.json'
import baltimoreCounty from './baltimore-county.json'

export interface RegulatedArea {
  id: string
  name: string        // full name for the map popup
  short: string       // compact label for listing badges
  summary: string[]   // short bullet points for the map popup
  url: string         // official ordinance / program page
  geometry: Polygon | MultiPolygon
}

export const REGULATED_AREAS: RegulatedArea[] = [
  {
    id: 'frederick-city',
    name: 'City of Frederick — Rental Licensing',
    short: 'City of Frederick rental license',
    summary: [
      'Every rental unit needs a city rental license (since Jan 1, 2024)',
      '$240 per unit for a 2-year license',
      'Random annual inspections; must meet Rental Licensing Maintenance Standards',
      'City property tax applies on top of county tax',
    ],
    url: 'https://www.cityoffrederickmd.gov/1588/Rental-Licensing-Ordinance',
    geometry: frederickCity as Polygon, // OSM relation 133229
  },
  {
    id: 'howard-county',
    name: 'Howard County — Rental Housing License',
    short: 'Howard County rental license',
    summary: [
      'A county rental housing license is required to rent any dwelling unit',
      'Application fee about $20–$94',
      'The county inspects the unit after you apply',
    ],
    url: 'https://onestop.md.gov/licenses/rental-housing-license-5d1540ca54f24d03e9998b65',
    geometry: howardCounty as Polygon, // OSM relation 936304
  },
  {
    id: 'montgomery-county',
    name: 'Montgomery County — Rental Housing License',
    short: 'Montgomery County rental license',
    summary: [
      'A rental license is required before offering any unit for rent',
      'Renewed every year (July 1 – June 30)',
      'Pre-1978 homes must meet Maryland lead-paint standards',
      'Unlicensed landlords can’t sue for unpaid rent; some cities (e.g. Rockville, Gaithersburg, Takoma Park) add their own rules',
    ],
    url: 'https://montgomerycountymd.gov/DHCA/housing/landlordtenant/licensing.html',
    geometry: montgomeryCounty as Polygon, // OSM relation 936970
  },
  {
    id: 'baltimore-county',
    name: 'Baltimore County — Rental Registration',
    short: 'Baltimore County rental registration',
    summary: [
      'Rental units must be registered with the county',
      '$60 per non-owner-occupied unit',
      'Requires an inspection sheet from a licensed home inspector (some small properties can file an exemption affidavit)',
    ],
    url: 'https://www.baltimorecountymd.gov/departments/pai/rental-registration',
    geometry: baltimoreCounty as Polygon, // OSM relation 936321
  },
]

// Ray-casting point-in-polygon (outer ring minus holes)
function inRing([x, y]: [number, number], ring: Position[]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function inPolygon(pt: [number, number], rings: Position[][]) {
  return inRing(pt, rings[0]) && !rings.slice(1).some((hole) => inRing(pt, hole))
}

/** Regulated areas containing a point (most specific — cities — listed first). */
export function regulatedAreasAt(lat: number, lng: number): RegulatedArea[] {
  const pt: [number, number] = [lng, lat]
  return REGULATED_AREAS.filter((a) =>
    a.geometry.type === 'Polygon'
      ? inPolygon(pt, a.geometry.coordinates)
      : a.geometry.coordinates.some((p) => inPolygon(pt, p)),
  )
}
