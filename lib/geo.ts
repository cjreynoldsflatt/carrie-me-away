// Create a GeoJSON polygon approximating a circle
// center: [lng, lat], radius in miles
export function circleGeoJSON(
  center: [number, number],
  radiusMiles: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const radiusKm = radiusMiles * 1.60934
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dx = (radiusKm / 111.32 / Math.cos((center[1] * Math.PI) / 180)) * Math.cos(angle)
    const dy = (radiusKm / 110.574) * Math.sin(angle)
    coords.push([center[0] + dx, center[1] + dy])
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  }
}
