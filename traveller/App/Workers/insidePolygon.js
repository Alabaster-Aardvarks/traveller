// not used
export const insidePolygon = (poly, lat, lng) => {
  let inside = false

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ( ((poly[i].longitude > lng) != (poly[j].longitude > lng)) &&
         (lat < (poly[j].latitude-poly[i].latitude) * (lng-poly[i].longitude) / (poly[j].longitude-poly[i].longitude) + poly[i].latitude) ) {
      inside = !inside
    }
  }

  return inside
}
