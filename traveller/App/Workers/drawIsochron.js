// Isochron object format:
//   isochron = { geojson: { coordinates: [ [ [ [lng,lat]...polygon... ], [ [lng,lat]...hole... ] ] ] } }

export const drawIsochron = (self, debug, isochron, index, downSamplingCoordinates) => {

  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'index', log: index })) }
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'isochron', log: isochron })) }
  let geojson = isochron.geojson
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'geojson', log: geojson })) }
  let polygons = []
  for (let i = 0; i < geojson.coordinates.length; i++) {
    let polygon = []
    let holes = []
    for (let a = 0; a < geojson.coordinates[i].length; a++) {
      let coordinates = geojson.coordinates[i][a]
      let p = []
      let keep = 0;
      for (let c = 0; c < coordinates.length; c++) {
        if (keep === 0) { p.push({ longitude: coordinates[c][0], latitude: coordinates[c][1] }) }
        if (downSamplingCoordinates > 1 && coordinates.length > 20) {
          keep = ++keep % (downSamplingCoordinates - 1)
        }
      }
      if (a === 0) { // polygon
        polygon = p
      } else { // hole (inner polygon)
        holes.push(p)
      }
    }

    // FIXME? remove index from each polygon, not used right now
    polygons.push({ index: index, polygon: polygon, holes: holes })
    if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'polygons', log: polygons })) }
  }

  self.postMessage(JSON.stringify({ id: 'update', index: index, polygons: polygons }))

}
