import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'
import Secrets from 'react-native-config'
import { drawIsochron } from './drawIsochron'

const debug = false // set to true to enable log messages for debug
// NOTE: if fetching all isochrons at once, we need equitemporal travel times
const useBoundaryDuration = true // if true, will fetch all isochrons at once, otherwise one by one

const provider = 'GRAPHHOPPER'
const key = process.env.GRAPHHOPPER_KEY || Secrets.GRAPHHOPPER_KEY // API key
const directUrl = 'https://graphhopper.com/api/1'
const serverEndpointUrl = process.env.GRAPHHOPPER_ISOCHRON_SERVER_ENDPOINT || Secrets.GRAPHHOPPER_ISOCHRON_SERVER_ENDPOINT
const serverUrl = serverEndpointUrl ? process.env.ISOCHRON_SERVER_URL || Secrets.ISOCHRON_SERVER_URL || directUrl : directUrl
const useDirect = serverUrl.match(/graphhopper\.com/) ? true : false

const api = create({ baseURL: serverUrl })

// get message from application
self.onmessage = messageString => {
  const message = JSON.parse(messageString)

  if (message.id === 'start') {
    if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'start', log: message.params })) }
    loadIsochron(message.params)
  } else {
    self.postMessage(JSON.stringify({ id: 'error', error: `${provider} isochron worker unknown message: ${messageString}` }))
  }
}

const loadIsochron = params => {

  // isochron starting point
  const latitude = params.latitude
  const longitude = params.longitude
  const durations = useBoundaryDuration ? [ params.durations.slice(1) ] : params.durations.slice(1) // skip first index (always 0)
  const dateTime = params.dateTime.replace(/\.\d{3}/,'').replace(/[-:]*/g, '').replace(/Z$/, '') // remove second decimals, separators, and ending Z
  const downSamplingCoordinates = 0 * params.downSamplingCoordinates
  const fromTo = params.fromTo
  const transportMode = params.transportMode === 'car'     ? 'car'  :
                        params.transportMode === 'walk'    ? 'foot' : // FIXME? other option is 'hike'
                        params.transportMode === 'bike'    ? 'bike' :
                        params.transportMode === 'transit' ? 'bus'  : 'foot' // FIXME: bus is not really transit

  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'params', log: params })) }

  return Promise.all(
    durations.map((duration, index) => {
      let durationQuery = ''
      if (Array.isArray(duration)) {
        durationQuery += `&time_limit=${duration[duration.length - 1]}&buckets=${duration.length}`
      } else {
        durationQuery += `&time_limit=${duration}`
      }

      // Query for this isochron
      const keyQuery = `&key=${key}`
      const modeQuery = `&vehicle=${transportMode}`
      const flowQuery = fromTo === 'to' ? '&reverse_flow=true' : ''
      const dateTimeQuery = `&datetime=${dateTime}` // FIXME: not sure if this is supported
      const isochronEndpointUrl = `/isochrone?point=${latitude},${longitude}${dateTimeQuery}${modeQuery}${flowQuery}${durationQuery}${keyQuery}`
      const url = useDirect ? isochronEndpointUrl : serverEndpointUrl
      const query = useDirect ? null : { url: `${directUrl}${isochronEndpointUrl}` }

      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} request url`, log: url }))
      //console.log('url', url)
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
    const polygons = useBoundaryDuration ? polygonsArray[0] : polygonsArray

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
          //console.log(`Polygon #${index}, adding last hole...`)
          //holes.map(hole => a.push(hole))
          a.push(holes[holes.length - 1])
        }
        holes.push(p)
      }
      isochron.geojson.coordinates.push(a)
      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} isochron ${index}`, log: isochron }))
      drawIsochron(self, debug, isochron, index, downSamplingCoordinates)
    })
    self.postMessage(JSON.stringify({ id: 'done' }))
  })
  .catch(err => self.postMessage(JSON.stringify({ id: 'error', error: err })))
}
