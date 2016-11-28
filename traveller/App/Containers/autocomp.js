import { create } from 'apisauce'
import { encode } from 'base-64'
import Secrets from 'react-native-config'

const debug = false

const token = process.env.GOOGLE_KEY || Secrets.GOOGLE_KEY // google API key
const serverUrl = process.env.AUTOCOMP_SERVER_URL || Secrets.AUTOCOMP_SERVER_URL
const api = create({ baseURL: serverUrl })

const formatter = (text) 


export const getAutoComp = (partial) => {
  let search = formatter(partial);
  if (debug) console.tron.display({ name: 'potential values', value: 'fetching ' + partial })

  return api.get(`https://maps.googleapis.com/maps/api/place/queryautocomplete/json?key=${token}&input=${search}`, { lat: position.latitude, long: position.longitude })
  .then(resp => {
    if (!resp.ok) {
      console.tron.error(`Could not fetch ${partial} autocomplete from server [${resp.problem}]`)
      return
    }

    if (debug) console.tron.display({ name: 'getPlaces response', value: resp.data })

    return resp.data
    
  })

}
