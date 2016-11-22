// @flow

import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  toggleTraffic: null,
  setMaxDuration: ['duration'],
  setMapBrand: ['mapBrand'],
  setMapStyle: ['mapStyle'],
  setUnitOfMeasurement: ['unitOfMeasurement']
})

export const MapTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  mapBrand: 'Google Maps',
  duration: 60,
  traffic: false,
  unitOfMeasurement: 'Miles',
  mapStyle: 'Standard'
})

/* ------------- Reducers ------------- */

export const toggleTraffic = (state: Object) => {
  if (state.traffic === false) {
    return state.merge({ traffic: true })
  } else {
    return state.merge({ traffic: false })
  }
}

export const setMaxDuration = (state: Object, action: Object) => {
  const { duration } = action
  return state.merge({ duration })
}

export const setMapBrand = (state : Object, action: Object) => {
  const { mapBrand } = action
  return state.merge({ mapBrand })
}

export const setMapStyle = (state : Object, action: Object) => {
  const { mapStyle } = action
  return state.merge({ mapStyle })
}

export const setUnitOfMeasurement = (state : Object, action: Object) => {
  const { unitOfMeasurement } = action
  return state.merge({ unitOfMeasurement })
}


/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.TOGGLE_TRAFFIC]: toggleTraffic,
  [Types.SET_MAX_DURATION]: setMaxDuration,
  [Types.SET_MAP_BRAND]: setMapBrand,
  [Types.SET_MAP_STYLE]: setMapStyle,
  [Types.SET_UNIT_OF_MEASUREMENT]: setUnitOfMeasurement
})
