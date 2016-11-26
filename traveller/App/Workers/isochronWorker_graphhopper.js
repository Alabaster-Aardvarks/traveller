import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'
import Secrets from 'react-native-config'

const debug = false // enable log messages for debug
// NOTE: if fetching all isochrons at once, we need equitemporal travel times
const useBoundaryDuration = true // if true, will fetch all isochrons at once, otherwise one by one

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

const provider = 'GRAPHHOPPER'
const key = process.env.GRAPHHOPPER_KEY || Secrets.GRAPHHOPPER_KEY // API key
const directUrl = 'https://graphhopper.com/api/1'
const serverEndpointUrl = process.env.GRAPHHOPPER_ISOCHRON_SERVER_ENDPOINT || Secrets.GRAPHHOPPER_ISOCHRON_SERVER_ENDPOINT
const serverUrl = serverEndpointUrl ? process.env.ISOCHRON_SERVER_URL || Secrets.ISOCHRON_SERVER_URL || directUrl : directUrl
const useDirect = serverUrl.match(/graphhopper\.com/) ? true : false

const api = create({ baseURL: serverUrl })

const loadIsochron = params => {

  // isochron starting point
  let latitude = params.latitude
  let longitude = params.longitude
  let durations = useBoundaryDuration ? [ params.durations.slice(1) ] : params.durations.slice(1) // skip first index (always 0)
  let dateTime = params.dateTime.replace(/\.\d{3}/,'').replace(/[-:]*/g, '').replace(/Z$/, '') // remove second decimals, separators, and ending Z
  let downSamplingCoordinates = 0 * params.downSamplingCoordinates
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'params', log: params })) }

  return Promise.all(
    durations.map((duration, index) => {
      let durationQuery = ''
      if (Array.isArray(duration)) {
        // IMPORTANT: we can only support equitemporal travel times
        durationQuery += `&time_limit=${duration[duration.length - 1]}&buckets=${duration.length}`
      } else {
        durationQuery += `&time_limit=${duration}`
      }
      durationQuery += `&vehicle=car` // FIXME: bike, car, foot, bus, hike

      // Query for this isochron
      // https://graphhopper.com/api/1/isochrone?point=51.131108%2C12.414551&key=[YOUR_KEY]
      let keyQuery = `&key=${key}`
      let isochronEndpointUrl = `/isochrone?point=${latitude},${longitude}&datetime=${dateTime}${durationQuery}${keyQuery}`
      let url = useDirect ? isochronEndpointUrl : serverEndpointUrl
      let query = useDirect ? null : { url: `${directUrl}${isochronEndpointUrl}` }

      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} request url`, log: url }))
      return api.get(url, query)
      .then(resp => {
        if (!resp.ok) {
          self.postMessage(JSON.stringify({ id: 'error', error: 'Request to ' + url + ' failed [' + resp.problem + ']' }))
          return
        }
        if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} isochron response`, log: resp.data }))

        return useBoundaryDuration ? resp.data.polygons : resp.data.polygons[0]
      })
    })
  )
  .then(polygonsArray => {
    let polygons = useBoundaryDuration ? polygonsArray[0] : polygonsArray

    if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} polygons`, log: polygons }))
    let holes = []
    polygons.map((polygon, index) => {
      //console.log('polygon', polygon)
      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} polygon ${index}`, log: polygon }))
      let isochron = {}
      isochron.geojson = {}
      isochron.geojson.coordinates = []
      let a = []
      for (let l = 0; l < polygon.geometry.coordinates.length; l++) {
        let p = polygon.geometry.coordinates[l]
        a.push(p)
        if (l === 0 && holes.length) {
          //console.log(`Polygon #${index}, adding ${holes.length} holes...`)
          holes.map(hole => a.push(hole))
        }
        holes.push(p)
      }
      isochron.geojson.coordinates.push(a)
      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} isochron ${index}`, log: isochron }))
      drawIsochron(isochron, index, downSamplingCoordinates)
    })
    self.postMessage(JSON.stringify({ id: 'done' }))
  })
  .catch(err => self.postMessage(JSON.stringify({ id: 'error', error: err })))

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
