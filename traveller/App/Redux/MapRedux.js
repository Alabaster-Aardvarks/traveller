// @flow

import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  temperatureRequest: ['city'],
  temperatureSuccess: ['temperature'],
  temperatureFailure: null,
  toggleTraffic: null,
  setMaxDuration: ['duration']
})

export const MapTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  mapBrand: 'Google Maps',
  duration: 60,
  traffic: false,
  mileType: 'Miles',
  mapType: 'Normal'
})

/* ------------- Reducers ------------- */

// request the temperature for a city
export const request = (state: Object, { city }: Object) =>
  state.merge({ fetching: true, city, temperature: null })

// successful temperature lookup
export const success = (state: Object, action: Object) => {
  const { temperature } = action
  return state.merge({ fetching: false, error: null, temperature })
}

// failed to get the temperature
export const failure = (state: Object) =>
  state.merge({ fetching: false, error: true, temperature: null })

export const toggleTraffic = (state: Object) => {
  if (state.traffic === false) {
    return state.merge({ traffic: true })
  } else {
    return state.merge({ traffic: false })
  }
}

export const setMaxDuration = (state: Object, { duration }: Object) => {
  console.tron.log(duration)
  state.merge({ duration: duration })
}


/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.TEMPERATURE_REQUEST]: request,
  [Types.TEMPERATURE_SUCCESS]: success,
  [Types.TEMPERATURE_FAILURE]: failure,
  [Types.TOGGLE_TRAFFIC]: toggleTraffic,
  [Types.SETMAXDURATION]: setMaxDuration
})
