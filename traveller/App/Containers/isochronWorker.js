import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'

let debug = false;

// get message from application
self.onmessage = messageString => {
  let message = JSON.parse(messageString)

  if (message.id === 'start') {
    //if (debug) { self.postMessage(JSON.stringify({ id: 'log', log: message.params })) }
    loadIsochron(message.params)
  } else {
    self.postMessage(JSON.stringify({ id: 'error', error: 'Isochron worker unknown message: ' + messageString }))
  }
}

// Navitia API token
const token = '3a8b7ce9-ef1a-4ff5-b65a-5cffcafcfc47';

// Set API headers
const api = create({ baseURL: 'https://api.navitia.io/v1' });
api.setHeaders({ 'Authorization': 'Basic ' + encode(token) });

const loadIsochron = params => {

  // isochron starting point
  let latitude = params.latitude
  let longitude = params.longitude
  let durations = params.durations
  let dateTime = params.dateTime
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'params', log: params })) }

  let duration_step = 600 // default to 10 minutes

  // get region based on location
  return api.get(`/coord/${longitude};${latitude}`)
  .then(resp => {
    let region = resp.data.regions[0]
    if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'region', log: region })) }

    return Promise.all(
      durations.map((duration, index) => {
        if (index < durations.length - 1) {
          duration_step = durations[index + 1] - duration
        }
        let minDuration = duration
        let maxDuration = minDuration + duration_step

        // Navitia query for this isochron
        //https://api.navitia.io/v1/coverage/us-ca/isochrones?from=-122.4106772%3B37.7825177&datetime=20161109T184927&boundary_duration%5B%5D=600&boundary_duration%5B%5D=1200&boundary_duration%5B%5D=1800&boundary_duration%5B%5D=2400&boundary_duration%5B%5D=3000&boundary_duration%5B%5D=3600&
        let url = `/coverage/${region}/isochrones?from=${longitude};${latitude}`
                  + `&datetime=${dateTime}`
                  + `&max_duration=${maxDuration}&min_duration=${minDuration}`

        return api.get(url)
        .then(resp => drawIsochron(resp.data.isochrones[0], index)) // we have only one isochrone
      })
    )
    .then(() => self.postMessage(JSON.stringify({ id: 'done' })))
  })
  .catch(err => self.postMessage(JSON.stringify({ id: 'error', error: 'Navitia region not found [' + err + ']' })))
}

const drawIsochron = (isochron, index) => {
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
      for (let c = 0; c < coordinates.length; c++) {
        p.push({ longitude: coordinates[c][0], latitude: coordinates[c][1] })
      }
      if (a === 0) { // polygon
        polygon = p
      } else { // hole (inner polygon)
        holes.push(p)
      }
    }
    polygons.push({ index: index, polygon: polygon, holes: holes })
    if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'polygons', log: polygons })) }
  }

  self.postMessage(JSON.stringify({ id: 'update', index: index, polygons: polygons }))
}
