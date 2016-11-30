import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'
import Secrets from 'react-native-config'
import { drawIsochron } from './drawIsochron'
import r360 from './route360/r360-core-src'

const debug = false // set to true to enable log messages for debug
// NOTE: fetching isochrons one by one results in much bigger json data from route360, too big
const useBoundaryDuration = true  // if true, will fetch all isochrons at once, otherwise one by one

const provider = 'ROUTE360'
const key = process.env.ROUTE360_KEY || Secrets.ROUTE360_KEY
const directUrl = 'https://service.route360.net'

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

export const loadIsochron = params => {

  // isochron starting point
  const latitude = params.latitude
  const longitude = params.longitude
  const durations = useBoundaryDuration ? [ params.durations.slice(1) ] : params.durations.slice(1) // skip first index (always 0)
  const dateTime = params.dateTime
  const downSamplingCoordinates = params.downSamplingCoordinates
  const transportMode = params.transportMode // FIXME options are: car, transit, bike, walk
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'params', log: params })) }

  // route360 API
  r360.config.serviceKey = key
  r360.config.serviceUrl = directUrl + '/na_northwest/' // FIXME: region

  let travelOptions = r360.travelOptions()
  travelOptions.addSource({ lat : latitude, lng : longitude })
  travelOptions.setTravelType(transportMode)
  const travelDate = new Date(dateTime)
  const year = travelDate.getFullYear()
  const month = ('0' + (travelDate.getMonth() + 1)).slice(-2)
  const day = ('0' + travelDate.getDate()).slice(-2)
  travelOptions.setDate(`${year}${month}${day}`)
  const hours = travelDate.getHours()
  const mins = travelDate.getMinutes()
  travelOptions.setTime((hours * 3600 + mins * 60).toString()) // ignore seconds

  return Promise.all(
    durations.map((duration, index) => {
      if (Array.isArray(duration)) {
        //console.log('duration', duration)
        travelOptions.setTravelTimes(duration)
      } else {
        travelOptions.setTravelTimes([ duration ])
      }

      return new Promise((resolve, reject) => {
        r360.PolygonService.getTravelTimePolygons(travelOptions, polygons => {
          resolve(useBoundaryDuration ? polygons : polygons[0])
        }, (status, message) => {
          reject(`Unable to get ${provider} isochrons: ${message} [${status}]`)
        })
      })
    })
  )
  // need to wait for all isochrons to compute holes
  .then(polygonsArray => {
    const polygons = useBoundaryDuration ? polygonsArray[0].reverse() : polygonsArray
    if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} polygons`, log: polygons }))
    let holes = []
    polygons.map((polygon, index) => {
      //console.log('polygon', polygon)
      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} polygon ${index}`, log: polygon }))
      let isochron = {}
      isochron.geojson = {}
      isochron.geojson.coordinates = []
      let a = []
      for (let l = 0; l < polygon.polygons[0].lineStrings.length; l++) {
        let coords = polygon.polygons[0].lineStrings[l].coordinates
        let p = []
        for (let i = 0; i < coords.length; i++) {
          p.push([ coords[i].lng, coords[i].lat ])
        }
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
      // FIXME? use polygon.polygons[0].travelTime to calculate index?
      drawIsochron(self, debug, isochron, index, downSamplingCoordinates)
    })
    self.postMessage(JSON.stringify({ id: 'done' }))
  })
  .catch(err => self.postMessage(JSON.stringify({ id: 'error', error: err })))
}
