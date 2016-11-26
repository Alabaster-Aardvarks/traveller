import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'
import Secrets from 'react-native-config'

const debug = false // enable log messages for debug
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

const provider = 'HERE'
const appCode = process.env.HERE_APP_CODE || Secrets.HERE_APP_CODE
const appId = process.env.HERE_APP_ID || Secrets.HERE_APP_ID
const directUrl = 'https://isoline.route.cit.api.here.com/routing/7.2'
const serverEndpointUrl = process.env.HERE_ISOCHRON_SERVER_ENDPOINT || Secrets.HERE_ISOCHRON_SERVER_ENDPOINT
const serverUrl = serverEndpointUrl ? process.env.ISOCHRON_SERVER_URL || Secrets.ISOCHRON_SERVER_URL || directUrl : directUrl
const useDirect = serverUrl.match(/api\.here\.com/) ? true : false

const api = create({ baseURL: serverUrl })

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
      let durationQuery = '&range='
      if (Array.isArray(duration)) {
        durationQuery += duration.slice(1).join(',')
      } else {
        if (index === 0) { return } // first duration is min duration
        durationQuery += duration
      }
      let modeQuery = 'mode=fastest;pedestrian;traffic:disabled;boatFerry:0' // FIXME

      // query for this isochron
      //https://isoline.route.cit.api.here.com/routing/7.2/calculateisoline.json?mode=fastest%3Bcar&start=52.5160%2C13.3778&rangetype=time&range=300&app_id=DemoAppId01082013GAL&app_code=AJKnXv84fjrb0KIHawS0Tg
      let appIdCodeQuery = `&app_id=${appId}&app_code=${appCode}`
      let singleComponentQuery = `&singlecomponent=true`
      let isochronEndpointUrl = `/calculateisoline.json?${modeQuery}&start=geo!${latitude},${longitude}&rangetype=time${durationQuery}${singleComponentQuery}${appIdCodeQuery}`
      let url = useDirect ? isochronEndpointUrl : serverEndpointUrl
      let query = useDirect ? null : { url: `${directUrl}${isochronEndpointUrl}` }

      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} request url`, log: url }))
      return api.get(url, query)
      .then(resp => {
        if (!resp.ok) {
          self.postMessage(JSON.stringify({ id: 'error', error: 'Request to ' + url + ' failed [' + resp.problem + ']' }))
          return
        }

        if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} isochron`, log: resp.data }))
        // resp.data.response.isoline[0].component[0].shape

        let holes = []
        for (let l = 0; l < resp.data.response.isoline.length; l++) {
          let isochron = {}
          isochron.geojson = {}
          isochron.geojson.coordinates = []
          let types = []
          if (resp.data.response.isoline[l].component) {
            types.push('component')
          }
          if (resp.data.response.isoline[l].connection) {
            types.push('connection')
          }
          types.map(type => {
            //console.log('type', type)
            let typeLength = type === 'component' ? resp.data.response.isoline[l].component.length : resp.data.response.isoline[l].connection.length
            //console.log('typeLength', typeLength)
            for (let c = 0; c < typeLength; c++) {
              let a = []
              let p = []
              let typeShape = type === 'component' ? resp.data.response.isoline[l].component[c].shape : resp.data.response.isoline[l].connection[c].shape
              //console.log('typeShape length', typeShape.length)
              let coords = typeShape
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
              if (holes.length) {
                //console.log(`Polygon #${index}, adding ${holes.length} holes...`)
                holes.map(hole => a.push(hole))
              }
              holes.push(p)
              isochron.geojson.coordinates.push(a)
            }
          })
          // FIXME? get idx from resp.data.response.isoline[l].range?
          let idx = Array.isArray(duration) ? l : index - 1
          drawIsochron(isochron, idx, downSamplingCoordinates)
        }
      })
    })
  )
  .then(() => self.postMessage(JSON.stringify({ id: 'done' })))
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
