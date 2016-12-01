import { create } from 'apisauce'
import { encode } from 'base-64'
import Secrets from 'react-native-config'
import { Worker } from 'react-native-workers'
import { isochronsState, polygonsState, savedPolygonsFeature, doneWithSavedPolygonsFeature,
         ISOCHRON_LOADED, ISOCHRON_ERROR, POLYGONS_LOADED } from './isochron'

const debug = false // set to true to enable log messages for debug

export const PLACES_NOT_LOADED = 'PLACES_NOT_LOADED'
export const PLACES_LOADING = 'PLACES_LOADING'
export const PLACES_LOADED = 'PLACES_LOADED'
export const PLACES_INDEXED = 'PLACES_INDEXED'
export const PLACES_ERROR = 'PLACES_ERROR'

const key = process.env.GOOGLE_KEY || Secrets.GOOGLE_KEY // google API key
const serverUrl = process.env.PLACES_SERVER_URL || Secrets.PLACES_SERVER_URL
const api = create({ baseURL: serverUrl })

let workers = {}
let updatePlacesState = null

export let savedPlaces = {}

export const setUpdatePlacesStateFn = updateFn => {
  updatePlacesState = updateFn
}

export const loadPlaces = args => {
  if (!savedPolygonsFeature) { return } // do not update places if we don't have a new set of polygons
  const params = args.params

  updatePlacesState && updatePlacesState(PLACES_LOADING)
  const placesInfo = params.placesInfo

  let counter = 0, length = Object.keys(placesInfo).length
  return Promise.all(
    Object.keys(placesInfo).map(type => {
      if (!placesInfo[type].enabled) {
        (length === ++counter) && updatePlacesState && updatePlacesState(PLACES_LOADED)
        return new Promise((resolve, reject) => resolve(`getPlaces ${type} disabled`))
      } else {
        return getPlaces({
          ...params,
          type,
          size: placesInfo[type].size,
        })
        .then(() => {
          (length === ++counter) && updatePlacesState && updatePlacesState(PLACES_LOADED)
          return placesInPolygonsUpdate(type)
        })
        .catch(err => console.error(err)) // we should never get here
      }
    })
  )
  .then(messages => {
    updatePlacesState && updatePlacesState(PLACES_INDEXED)
    doneWithSavedPolygonsFeature()
    messages.map(message => { message.match(/error/i) && console.tron.error(message) })
  })
  .catch(err => { // we should never get here
    updatePlacesState && updatePlacesState(PLACES_ERROR)
    doneWithSavedPolygonsFeature()
    console.error(err)
  })
}

const getPlaces = params => {
  const { type, position, mode, radius, date, size } = params
  return new Promise((resolve, reject) => {
    if (debug) console.tron.display({ name: `getPlaces fetching [${type}], transport mode: ${mode}`, value: position })
    terminatePlacesInPolygonsWorker(type) // terminate worker if running

    api.get(`/places/${type}`, { lat: position.latitude, long: position.longitude, mode, radius, date, size })
    .then(resp => {
      if (!resp.ok) {
        const err = `Unable to fetch ${type} places from server [${resp.problem}]`
        console.tron.error(err)
        resolve(`ERROR: ${err}`) // use resolve instead of reject to avoid blocking upper promise resolution
        return
      }

      if (debug) console.tron.display({ name: `getPlaces response [${type}]`, value: resp.data })

      savedPlaces[type] = resp.data
      resolve(`getPlaces done [${type}]`)
    })
    // use resolve instead of reject to avoid blocking upper promise resolution
    .catch(err => { console.error(err); resolve(`ERROR: ${err}`) }) // should never get here
  })
}

export const convertDayHourMinToSeconds = duration => {
  let matches = duration.match(/(?:(\d+)\s+days?|)\s*(?:(\d+)\s+hours?|)\s*(?:(\d+)\s+mins?|)\s*(?:(\d+)\s+sec|)/)
  if (!matches) { return 0 }
  let seconds = (matches[1] || 0) * 3600 * 24 + (matches[2] || 0) * 3600 + (matches[3] || 0) * 60 + (matches[4] || 0)
  return seconds
}

export const terminatePlacesInPolygonsWorker = type => {
  if (workers[type]) {
    if (debug) console.tron.display({ name: `terminatePlacesInPolygonsWorker [${type}]`, value: `terminating places in polygons worker [${type}]` })
    workers[type].terminate() // terminate worker if it was running
    workers[type] = null
  }
}

const placesInPolygonsUpdate = type => {
  return new Promise((resolve, reject) => {
    if (debug) console.tron.display({ name: `placesInPolygonsUpdate [${type}] ${isochronsState}`, value: '' })
    if (isochronsState !== ISOCHRON_LOADED) { resolve('ERROR - no isochrones'); return } // no isochrones, abort
    if (!savedPlaces[type]) { resolve(`ERROR - no ${type} places`); return } // no places for this type

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
        //console.log(`done -- resolving promise for ${type}`)
        resolve('done')
      } else if (message.id === 'log') {
        console.tron.display({ name: `PlacesInPolygons worker [${type}]: ${message.name}`, value: message.log })
      } else if (message.id === 'error') {
        console.tron.error(`PlacesInPolygons worker [${type}]: ${message.error}`)
        terminatePlacesInPolygonsWorker(type)
        // using resolve instead of reject as we don't want a problem with an error for one type to affect other types
        resolve(`ERROR - PlacesInPolygons worker [${type}]: ${message.error}`)
      } else {
        console.tron.error(`PlacesInPolygons worker [${type}]: ${messageString}`)
        terminatePlacesInPolygonsWorker(type)
        // using resolve instead of reject as we don't want a problem with an error for one type to affect other types
        resolve(`ERROR - PlacesInPolygons worker [${type}]: ${messageString}`)
      }
    }

    if (debug) console.tron.display({ name: `PlacesInPolygons worker [${type}] start`, value: savedPlaces[type] })
    workers[type].postMessage(JSON.stringify({ id: 'start', places: savedPlaces[type], polygonsFeature: savedPolygonsFeature }))
  })
}
