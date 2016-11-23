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

// app_id=X0bss1pScZtGlPhLZO6F / app_code=D0bwFFcSVdrVKEDCnBwZ2Q
const token = process.env.NOKIA_TOKEN || Secrets.NOKIA_TOKEN // navitia API token
const nokiaUrl = 'https://isoline.route.cit.api.here.com/routing/7.2'
const serverUrl = nokiaUrl // process.env.ISOCHRON_SERVER_URL || Secrets.ISOCHRON_SERVER_URL || nokiaUrl
const api = create({ baseURL: serverUrl })
const useNokia = serverUrl.match(/here\.com/) ? true : false
const serverEndpointUrl = '/nokiaHere'

const loadIsochron = params => {

  // isochron starting point
  let latitude = params.latitude
  let longitude = params.longitude
  let durations = useBoundaryDuration ? [ params.durations ] : params.durations
  let dateTime = params.dateTime.replace(/\.\d{3}/,'').replace(/[-:]*/g, '').replace(/Z$/, '') // remove second decimals, separators, and ending Z
  let downSamplingCoordinates = params.downSamplingCoordinates
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'params', log: params })) }

  return Promise.all(
    durations.map((duration, index) => {
      let durationQuery = ''
      if (Array.isArray(duration)) {
        // FIXME? not implemented
        duration.map((d, i) => {
          durationQuery += (i === 0) ? `&min_duration=${d}` : `&boundary_duration[]=${d}`
        })
      } else {
        if (index === 0) { return } // first duration is min duration
        durationQuery += `&range=${duration}`
      }

      // Nokia Here query for this isochron
      //https://isoline.route.cit.api.here.com/routing/7.2/calculateisoline.json?mode=fastest%3Bcar&start=52.5160%2C13.3778&rangetype=time&range=300&app_id=DemoAppId01082013GAL&app_code=AJKnXv84fjrb0KIHawS0Tg
      let appIdCodeQuery = '&app_id=X0bss1pScZtGlPhLZO6F&app_code=D0bwFFcSVdrVKEDCnBwZ2Q'
      let nokiaIsochronUrl = `/calculateisoline.json?mode=fastest;car&start=${latitude},${longitude}&rangetype=time${durationQuery}${appIdCodeQuery}`
      let url = useNokia ? nokiaIsochronUrl : serverEndpointUrl
      let query = useNokia ? null : { url: `${nokiaUrl}${nokiaIsochronUrl}` }

      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: 'nokia here request url', log: url }))
      return api.get(url, query)
      .then(resp => {
        if (!resp.ok) {
          self.postMessage(JSON.stringify({ id: 'error', error: 'Request to ' + url + ' failed [' + resp.problem + ']' }))
          return
        }

        if (debug) self.postMessage(JSON.stringify({ id: 'log', name: 'nokia here isochron', log: resp.data }))
        // resp.data.response.isoline[0].component[0].shape

        if (Array.isArray(duration)) {
          // FIXME? not implemented
          duration.shift() // remove first entry
          duration.map((d, idx) => drawIsochron(resp.data.isochrones[idx], idx))
        } else {
          let isochron = {}
          isochron.geojson = {}
          isochron.geojson.coordinates = []
          let a = []
          for (let l = 0; l < resp.data.response.isoline.length; l++) {
            let coords = resp.data.response.isoline[l].component[0].shape
            let p = []
            for (let i = 0; i < coords.length; i++) {
              let matches = coords[i].match(/^(.*),(.*)$/)
              if (matches) {
                let latitude = parseFloat(matches[1])
                let longitude = parseFloat(matches[2])
                p.push([ longitude, latitude ])
              } else {
                console.error('Not able to parse:', coords)
              }
            }
            a.push(p)
            // if (l === 0 && holes.length) {
            //   //console.log(`Polygon #${index}, adding ${holes.length} holes...`)
            //   holes.map(hole => a.push(hole))
            // }
            // holes.push(p)
          }
          isochron.geojson.coordinates.push(a)
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
