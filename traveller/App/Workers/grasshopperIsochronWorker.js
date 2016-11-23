import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'
import Secrets from 'react-native-config'

const debug = true // enable log messages for debug
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

const key = process.env.GRASSHOPPER_KEY || Secrets.GRASSHOPPER_KEY // API key
const grasshopperUrl = 'https://graphhopper.com/api/1'
const serverUrl = grasshopperUrl //process.env.ISOCHRON_SERVER_URL || Secrets.ISOCHRON_SERVER_URL || grasshopperUrl
const api = create({ baseURL: serverUrl })
const useGrasshopper = serverUrl.match(/graphhopper/) ? true : false
const serverEndpointUrl = '/grasshopper'

const loadIsochron = params => {

  // isochron starting point
  let latitude = params.latitude
  let longitude = params.longitude
  let durations = useBoundaryDuration ? [ params.durations ] : params.durations
  let dateTime = params.dateTime.replace(/\.\d{3}/,'').replace(/[-:]*/g, '').replace(/Z$/, '') // remove second decimals, separators, and ending Z
  let downSamplingCoordinates = 0 * params.downSamplingCoordinates
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'params', log: params })) }

  return Promise.all(
    durations.map((duration, index) => {
      let durationQuery = ''
      if (Array.isArray(duration)) {
        duration.map((d, i) => {
          // FIXME? not supported yet
          //durationQuery += (i === 0) ? `&min_duration=${d}` : `&boundary_duration[]=${d}`
        })
      } else {
        if (index === 0) { return } // first duration is min duration
        durationQuery += `&time_limit=${duration}`
      }
      durationQuery += `&vehicle=car`

      // Grasshopper query for this isochron
      // https://graphhopper.com/api/1/isochrone?point=51.131108%2C12.414551&key=[YOUR_KEY]
      let keyQuery = `&key=${key}`
      let grasshopperIsochronUrl = `/isochrone?point=${latitude},${longitude}&datetime=${dateTime}${durationQuery}${keyQuery}`
      let url = useGrasshopper ? grasshopperIsochronUrl : serverEndpointUrl
      let query = useGrasshopper ? null : { url: `${grasshopperUrl}${grasshopperIsochronUrl}` }

      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: 'grasshopper request url', log: url }))
      return api.get(url, query)
      .then(resp => {
        if (!resp.ok) {
          self.postMessage(JSON.stringify({ id: 'error', error: 'Request to ' + url + ' failed [' + resp.problem + ']' }))
          return
        }
        if (debug) self.postMessage(JSON.stringify({ id: 'log', name: 'grasshopper isochron response', log: resp.data }))

        if (Array.isArray(duration)) { // FIXME? not supported yet
          duration.shift() // remove first entry
          duration.map((d, idx) => drawIsochron(resp.data.polygons[idx], idx))
        } else {
          let isochron = {}
          isochron.geojson = {}
          isochron.geojson.coordinates = [ resp.data.polygons[0].geometry.coordinates ]

          if (debug) self.postMessage(JSON.stringify({ id: 'log', name: 'grasshopper isochron', log: isochron }))
          drawIsochron(isochron, index - 1, downSamplingCoordinates) // we have only one isochrone
        }
      })
    })
  )
  .then(() => self.postMessage(JSON.stringify({ id: 'done' })))
  .catch(err => self.postMessage(JSON.stringify({ id: 'error', error: err })))

}

const drawIsochron = (isochron, index, downSamplingCoordinates) => {
  // isochron = { geojson: { coordinates: [ [ [lng,lat]...polygon... ], [ [lng,lat]...hole... ] ] } }
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
