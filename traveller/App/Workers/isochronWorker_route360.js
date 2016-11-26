import r360 from '../../node_modules/route360/dist/r360-core-src'
import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'
import Secrets from 'react-native-config'

const debug = false // enable log messages for debug
// NOTE: fetching isochrons one by one results in much bigger json data from route360, too big
const useBoundaryDuration = true  // if true, will fetch all isochrons at once, otherwise one by one

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

const provider = 'ROUTE360'
const key = process.env.ROUTE360_KEY || Secrets.ROUTE360_KEY
const directUrl = 'https://service.route360.net/na_northwest/' // FIXME: region

export const loadIsochron = params => {

  // isochron starting point
  let latitude = params.latitude
  let longitude = params.longitude
  let durations = useBoundaryDuration ? [ params.durations.slice(1) ] : params.durations.slice(1) // skip first index (always 0)
  let dateTime = params.dateTime.replace(/\.\d{3}/,'').replace(/[-:]*/g, '').replace(/Z$/, '') // remove second decimals, separators, and ending Z
  let downSamplingCoordinates = params.downSamplingCoordinates
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'params', log: params })) }

  // route360 API
  r360.config.serviceKey = key
  r360.config.serviceUrl = directUrl

  // reverse geocoding: https://service.route360.net/geocode/reverse?lon=&lat=
  // https://service.route360.net/geocode/api?q=&lon&lat=&limit=5
  // https://service.route360.net/france_belgium/v1/polygon?cfg=%7B%22sources%22…1308382840306277781_1479789897324&key=OOWOFUK3OPHLQTA8H5JD&_=1479789897325

  let travelOptions = r360.travelOptions()
  travelOptions.addSource({ lat : latitude, lng : longitude })
  travelOptions.setTravelType('car') // FIXME options are: car, transit, bike, walk, biketransit, ebike, rentbike, rentandreturnbike
  travelOptions.setDate('20161121') // FIXME
  travelOptions.setTime('39000') // FIXME number of seconds 2:45pm = 53100

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
    let polygons = useBoundaryDuration ? polygonsArray[0].reverse() : polygonsArray
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
          console.log(`Polygon #${index}, adding ${holes.length} holes...`)
          holes.map(hole => a.push(hole))
        }
        holes.push(p)
      }
      isochron.geojson.coordinates.push(a)
      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} isochron ${index}`, log: isochron }))
      // FIXME? use polygon.polygons[0].travelTime to calculate index?
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
