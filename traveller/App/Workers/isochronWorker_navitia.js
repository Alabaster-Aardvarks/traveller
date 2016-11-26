import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'
import Secrets from 'react-native-config'
import { drawIsochron } from './drawIsochron'

const debug = false // enable log messages for debug
const useBoundaryDuration = false // if true, will fetch all isochrons at once, otherwise one by one

// get message from application
self.onmessage = messageString => {
  let message = JSON.parse(messageString)

  if (message.id === 'start') {
    if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'start', log: message.params })) }
    loadIsochron(message.params)
  } else {
    self.postMessage(JSON.stringify({ id: 'error', error: 'Isochron worker unknown message: ' + messageString }))
  }
}

const provider = 'NAVITIA'
const token = process.env.NAVITIA_TOKEN || Secrets.NAVITIA_TOKEN // navitia API token
const directUrl = 'https://api.navitia.io/v1'
const serverEndpointUrl = process.env.NAVITIA_ISOCHRON_SERVER_ENDPOINT || Secrets.NAVITIA_ISOCHRON_SERVER_ENDPOINT
const serverUrl = serverEndpointUrl ? process.env.ISOCHRON_SERVER_URL || Secrets.ISOCHRON_SERVER_URL || directUrl : directUrl
const useDirect = serverUrl.match(/api\.navitia\.io/) ? true : false

// set API headers
const api = create({ baseURL: serverUrl })
api.setHeaders({ 'Authorization': 'Basic ' + encode(token) })

const loadIsochron = params => {

  // isochron starting point
  let latitude = params.latitude
  let longitude = params.longitude
  let durations = useBoundaryDuration ? [ params.durations ] : params.durations
  let dateTime = params.dateTime.replace(/\.\d{3}/,'').replace(/[-:]*/g, '').replace(/Z$/, '') // remove second decimals, separators, and ending Z
  let downSamplingCoordinates = params.downSamplingCoordinates
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'params', log: params })) }

  // get region based on location
  const directRegionUrl = `/coord/${longitude};${latitude}`
  const regionUrl = useDirect ? directRegionUrl : serverEndpointUrl
  const regionQuery = useDirect ? null : { url: `${directUrl}${directRegionUrl}` }

  if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} region request url`, log: regionUrl }))
  return api.get(regionUrl, regionQuery)
  .then(resp => {
    if (!resp.ok) {
      self.postMessage(JSON.stringify({ id: 'error', error: `${provider} region not found [${resp.problem}]` }))
      return
    }

    let region = resp.data.regions[0]
    if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'region', log: region })) }

    return Promise.all(
      durations.map((duration, index) => {
        let durationQuery = ''
        if (Array.isArray(duration)) {
          duration.map((d, i) => {
            durationQuery += (i === 0) ? `&min_duration=${d}` : `&boundary_duration[]=${d}`
          })
        } else {
          if (index === 0) { return } // first duration is min duration
          let minDuration = durations[index - 1]
          let maxDuration = duration
          durationQuery += `&min_duration=${minDuration}&max_duration=${maxDuration}`
        }

        // Query for this isochron
        //https://api.navitia.io/v1/coverage/us-ca/isochrones?from=-122.4106772%3B37.7825177&datetime=20161109T184927&boundary_duration%5B%5D=600&boundary_duration%5B%5D=1200&boundary_duration%5B%5D=1800&boundary_duration%5B%5D=2400&boundary_duration%5B%5D=3000&boundary_duration%5B%5D=3600&
        let isochronEndpointUrl = `/coverage/${region}/isochrones?from=${longitude};${latitude}&datetime=${dateTime}${durationQuery}`
        let url = useDirect ? isochronEndpointUrl : serverEndpointUrl
        let query = useDirect ? null : { url: `${directUrl}${isochronEndpointUrl}` }

        if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} request url`, log: url }))
        return api.get(url, query)
        .then(resp => {
          if (!resp.ok) {
            self.postMessage(JSON.stringify({ id: 'error', error: 'Request to ' + url + ' failed [' + resp.problem + ']' }))
            return
          }

          if (Array.isArray(duration)) {
            duration.shift() // remove first entry
            duration.map((d, idx) => drawIsochron(self, debug, resp.data.isochrones[idx], idx, downSamplingCoordinates))
          } else {
            if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} isochron`, log: resp.data.isochrones[0] }))
            drawIsochron(self, debug, resp.data.isochrones[0], index - 1, downSamplingCoordinates) // we have only one isochrone
          }
        })
      })
    )
    .then(() => self.postMessage(JSON.stringify({ id: 'done' })))
  })
  .catch(err => self.postMessage(JSON.stringify({ id: 'error', error: `${provider} region not found [${err}]` })))
}

const drawIsochron = (isochron, index, downSamplingCoordinates) => {
  // isochron = { geojson: { coordinates: [ [ [ [lng,lat]...polygon... ], [ [lng,lat]...hole... ] ] ] } }
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
        if (downSamplingCoordinates > 1) {
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
