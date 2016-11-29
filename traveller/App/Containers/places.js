import { create } from 'apisauce'
import { encode } from 'base-64'
import Secrets from 'react-native-config'

const debug = false

const token = process.env.GOOGLE_KEY || Secrets.GOOGLE_KEY // google API key
const serverUrl = process.env.PLACES_SERVER_URL || Secrets.PLACES_SERVER_URL
const api = create({ baseURL: serverUrl })

export let savedPlaces = {}
export let placesTypes = { 'bank': true, 'health': true, 'transit': true  } // FIXME

api.setHeaders({ 'Authorization': 'Basic ' + encode(token) })

export const getPlaces = (type, position, mode) => {

  if (debug) console.tron.display({ name: 'getPlaces', value: 'fetching ' + type })

  return api.get(`/places/${type}`, { lat: position.latitude, long: position.longitude, mode: mode})
  .then(resp => {
    if (!resp.ok) {
      console.tron.error(`Could not fetch ${type} places from server [${resp.problem}]`)
      return
    }

    if (debug) console.tron.display({ name: 'getPlaces response', value: resp.data })

    savedPlaces[type] = resp.data
    return savedPlaces // not used
  })

}

export const convertDayHourMinToSeconds = duration => {
  let matches = duration.match(/(?:(\d+)\s+days?|)\s*(?:(\d+)\s+hours?|)\s*(?:(\d+)\s+mins?|)\s*(?:(\d+)\s+sec|)/)
  if (!matches) { return 0 }
  let seconds = (matches[1] || 0) * 3600 * 24 + (matches[2] || 0) * 3600 + (matches[3] || 0) * 60 + (matches[4] || 0)
  return seconds
}
