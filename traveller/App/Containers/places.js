import { create } from 'apisauce'
import { encode } from 'base-64'
import Secrets from 'react-native-config'
import { Worker } from 'react-native-workers'
import { isochronsState, savedPolygonsFeature, ISOCHRON_LOADED, ISOCHRON_ERROR,
         polygonsState, POLYGONS_LOADED } from './isochron'

const debug = false // set to true to enable log messages for debug

const key = process.env.GOOGLE_KEY || Secrets.GOOGLE_KEY // google API key
const serverUrl = process.env.PLACES_SERVER_URL || Secrets.PLACES_SERVER_URL
const api = create({ baseURL: serverUrl })

export let savedPlaces = {}
export let placesTypes = { 'bank': true, 'health': true, 'transit': true  } // FIXME

export const getPlaces = (type, position, mode) => {

  if (debug) console.tron.display({ name: `getPlaces fetching [${type}, ${mode}]`, value: position })
  terminatePlacesInPolygonsWorker(type) // terminate worker if running

  return api.get(`/places/${type}`, { lat: position.latitude, long: position.longitude, mode: mode })
  .then(resp => {
    if (!resp.ok) {
      console.tron.error(`Could not fetch ${type} places from server [${resp.problem}]`)
      return
    }

    if (debug) console.tron.display({ name: `getPlaces response [${type}]`, value: resp.data })

    savedPlaces[type] = resp.data
    return type
  })
  .catch(err => console.error(err))
}

export const convertDayHourMinToSeconds = duration => {
  let matches = duration.match(/(?:(\d+)\s+days?|)\s*(?:(\d+)\s+hours?|)\s*(?:(\d+)\s+mins?|)\s*(?:(\d+)\s+sec|)/)
  if (!matches) { return 0 }
  let seconds = (matches[1] || 0) * 3600 * 24 + (matches[2] || 0) * 3600 + (matches[3] || 0) * 60 + (matches[4] || 0)
  return seconds
}

let workers = {}
let retryCounters = {}
let retryDelay = 1

export const terminatePlacesInPolygonsWorker = type => {
  if (workers[type]) {
    if (debug) console.tron.display({ name: `terminatePlacesInPolygonsWorker [${type}]`, value: `terminating places in polygons worker [${type}]` })
    workers[type].terminate() // terminate worker if it was running
    workers[type] = null
    retryCounters[type] = null
    retryDelay = 1
  }
}

export const placesInPolygonsUpdate = type => {
  if (debug) console.tron.display({ name: `placesInPolygonsUpdate [${type}] ${isochronsState}`, value: '' })
  if (isochronsState === ISOCHRON_ERROR) { return } // no isochrones, abort

  // if isochrones or polygons are not fully loaded, retry up to 10 times
  if ((isochronsState !== ISOCHRON_LOADED || polygonsState !== POLYGONS_LOADED) && (!retryCounters[type] || (retryCounters[type] < 10))) {
    retryCounters[type] = ++retryCounters[type] || 1
    if (debug) console.tron.display({ name: `placesInPolygonsUpdate [${type}] polygons not ready, retrying...`, value: retryCounters[type] })
    setTimeout(() => placesInPolygonsUpdate(type), 1000 * retryDelay++) // retry later, increment retry delay
    return
  }

  terminatePlacesInPolygonsWorker(type)
  workers[type] = new Worker('App/Workers/placesInPolygonsWorker.js')

  workers[type].onmessage = messageString => {
    const message = JSON.parse(messageString)
    if (message.id === 'update') {
      if (debug) console.tron.display({ name: `PlacesInPolygons worker [${type}] update`, value: message.places })
      savedPlaces[type] = message.places
    } else if (message.id === 'done') {
      if (debug) console.tron.display({ name: `PlacesInPolygons worker [${type}] done`, value: '' })
      terminatePlacesInPolygonsWorker(type)
    } else if (message.id === 'log') {
      console.tron.display({ name: `PlacesInPolygons worker [${type}]: ${message.name}`, value: message.log })
    } else if (message.id === 'error') {
      console.tron.error(`PlacesInPolygons worker [${type}]: ${message.error}`)
      terminatePlacesInPolygonsWorker(type)
    } else {
      console.tron.error(`PlacesInPolygons worker [${type}]: ${messageString}`)
      terminatePlacesInPolygonsWorker(type)
    }
  }

  if (debug) console.tron.display({ name: `PlacesInPolygons worker [${type}] start`, value: savedPlaces[type] })
  workers[type].postMessage(JSON.stringify({ id: 'start', places: savedPlaces[type], polygonsFeature: savedPolygonsFeature }))
}
