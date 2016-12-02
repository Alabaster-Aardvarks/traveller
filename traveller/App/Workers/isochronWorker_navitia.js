import { create } from 'apisauce'
import { encode } from 'base-64'
import { self } from 'react-native-workers'
import Secrets from 'react-native-config'
import { drawIsochron } from './drawIsochron'

const debug = false // set to true to enable log messages for debug
const useBoundaryDuration = false // if true, will fetch all isochrons at once, otherwise one by one

const provider = 'NAVITIA'
const token = process.env.NAVITIA_TOKEN || Secrets.NAVITIA_TOKEN // navitia API token
const directUrl = 'https://api.navitia.io/v1'
const serverEndpointUrl = process.env.NAVITIA_ISOCHRON_SERVER_ENDPOINT || Secrets.NAVITIA_ISOCHRON_SERVER_ENDPOINT
const serverUrl = serverEndpointUrl ? process.env.ISOCHRON_SERVER_URL || Secrets.ISOCHRON_SERVER_URL || directUrl : directUrl
const useDirect = serverUrl.match(/api\.navitia\.io/) ? true : false

// set API headers
const api = create({ baseURL: serverUrl })
if (useDirect) {
  api.setHeaders({ 'Authorization': 'Basic ' + encode(token) })
}

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
  const durations = useBoundaryDuration ? [ params.durations ] : params.durations
  const dateTime = params.dateTime.replace(/\.\d{3}/,'').replace(/[-:]*/g, '').replace(/Z$/, '') // remove second decimals, separators, and ending Z
  const downSamplingCoordinates = params.downSamplingCoordinates
  const fromTo = params.fromTo
  const transportMode = params.transportMode
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

    const region = resp.data.regions[0]
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
          const minDuration = durations[index - 1]
          const maxDuration = duration
          durationQuery += `&min_duration=${minDuration}&max_duration=${maxDuration}`
        }

        // Query for this isochron
        const dateTimeQuery = `&datetime=${dateTime}`
        const fromToQuery = `${fromTo}=${longitude};${latitude}`
        // FIXME: figure out transport mode
        const transportObj = transportMode === 'bike' ? { walking: true,  car: false, bike: true,  bss: true  } :
                             transportMode === 'car'  ? { walking: false, car: true,  bike: false, bss: false } :
                             transportMode === 'walk' ? { walking: true,  car: false, bike: false, bss: false } :
                             /* default is walking, which includes public transit */ {}
        let transportQuery = ''
        for (let m in transportObj) {
          if (transportObj[m]) {
            transportQuery += `&first_section_mode[]=${m}&last_section_mode[]=${m}`
          }
        }
        const isochronEndpointUrl = `/coverage/${region}/isochrones?${fromToQuery}${dateTimeQuery}${durationQuery}${transportQuery}`
        const url = useDirect ? isochronEndpointUrl : serverEndpointUrl
        const query = useDirect ? null : { url: `${directUrl}${isochronEndpointUrl}` }
        //console.log('url', `${directUrl}${isochronEndpointUrl}`)

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
