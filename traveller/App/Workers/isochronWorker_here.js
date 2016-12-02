import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'
import Secrets from 'react-native-config'
import { drawIsochron } from './drawIsochron'

const debug = false // set to true to enable log messages for debug
const useBoundaryDuration = true // if true, will fetch all isochrons at once, otherwise one by one

const provider = 'HERE'
const appCode = process.env.HERE_APP_CODE || Secrets.HERE_APP_CODE
const appId = process.env.HERE_APP_ID || Secrets.HERE_APP_ID
const directUrl = 'https://isoline.route.cit.api.here.com/routing/7.2'
const serverEndpointUrl = process.env.HERE_ISOCHRON_SERVER_ENDPOINT || Secrets.HERE_ISOCHRON_SERVER_ENDPOINT
const serverUrl = serverEndpointUrl ? process.env.ISOCHRON_SERVER_URL || Secrets.ISOCHRON_SERVER_URL || directUrl : directUrl
const useDirect = serverUrl.match(/api\.here\.com/) ? true : false

const api = create({ baseURL: serverUrl })

// get message from application
self.onmessage = messageString => {
  let message = JSON.parse(messageString)

  if (message.id === 'start') {
    if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'start', log: message.params })) }
    loadIsochron(message.params)
  } else {
    self.postMessage(JSON.stringify({ id: 'error', error: `${provider} isochron worker unknown message: ${messageString}` }))
  }
}

const loadIsochron = params => {

  // isochron starting point
  let latitude = params.latitude
  let longitude = params.longitude
  let durations = useBoundaryDuration ? [ params.durations.slice(1) ] : params.durations.slice(1)
  let dateTime = params.dateTime
  let downSamplingCoordinates = params.downSamplingCoordinates
  let fromTo = params.fromTo
  let transportMode = params.transportMode
  let trafficMode = params.trafficMode
  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'params', log: params })) }

  return Promise.all(
    durations.map((duration, index) => {
      let durationQuery = '&range='
      if (Array.isArray(duration)) {
        durationQuery += duration.join(',')
      } else {
        durationQuery += duration
      }

      // see https://developer.here.com/rest-apis/documentation/routing/topics/resource-calculate-isoline.html

      // query for this isochron
      //   other possible options: maxpoints=100, quality=1 [1,2,3] 1 is default & best
      const modeQuery = `mode=fastest;${transportMode === 'car' ? 'car' : (transportMode === 'bike' ? 'bicycle' : 'pedestrian')};traffic:${trafficMode}`
      const resolutionQuery = '' // `&resolution=1` // meters per pixel
      const startDestQuery = `&${fromTo === 'from' ? 'start' : 'destination'}=geo!${latitude},${longitude}`
      const timeQuery = `&${fromTo === 'from' ? 'departure' : 'arrival'}=${dateTime}`
      const singleComponentQuery = `&singlecomponent=true`
      const appIdCodeQuery = useDirect ? `&app_id=${appId}&app_code=${appCode}` : ''
      const isochronEndpointUrl = `/calculateisoline.json?${modeQuery}${startDestQuery}${timeQuery}&rangetype=time${resolutionQuery}${durationQuery}${singleComponentQuery}${appIdCodeQuery}`
      const url = useDirect ? isochronEndpointUrl : serverEndpointUrl
      const query = useDirect ? null : { url: `${directUrl}${isochronEndpointUrl}` }

      if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} request url`, log: url }))
      return api.get(url, query)
      .then(resp => {
        if (!resp.ok) {
          self.postMessage(JSON.stringify({ id: 'error', error: 'Request to ' + url + ' failed [' + resp.problem + ']' }))
          return
        }

        if (debug) self.postMessage(JSON.stringify({ id: 'log', name: `${provider} isochron`, log: resp.data }))

        let holes = []
        for (let l = 0; l < resp.data.response.isoline.length; l++) {
          // FIXME? get idx from resp.data.response.isoline[l].range?
          let idx = Array.isArray(duration) ? l : index
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
                //console.log(`Polygon #${idx}, adding last hole only...`)
                //holes.map(hole => a.push(hole))
                a.push(holes[holes.length - 1])
              }
              holes.push(p)
              isochron.geojson.coordinates.push(a)
            }
          })

          drawIsochron(self, debug, isochron, idx, downSamplingCoordinates)
        }
      })
    })
  )
  .then(() => self.postMessage(JSON.stringify({ id: 'done' })))
  .catch(err => self.postMessage(JSON.stringify({ id: 'error', error: err })))
}
