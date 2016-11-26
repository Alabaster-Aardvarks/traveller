// @flow

import { createReducer, createActions } from 'reduxsauce'
import Immutable from 'seamless-immutable'

/* ------------- Types and Action Creators ------------- */

const { Types, Creators } = createActions({
  toggleTraffic: null,
  toggleMapTile: null,
  setMaxDuration: ['duration'],
  setMapBrand: ['mapBrand'],
  setMapStyle: ['mapStyle'],
  setUnitOfMeasurement: ['unitOfMeasurement'],
  setMapTile: ['mapTileName']
})

export const MapTypes = Types
export default Creators

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  url: 'test.com',
  header: 'test',
  format: 'JSON'
})

/* ------------- Reducers ------------- */

export const toggleTraffic = (state: Object) => {
  if (state.traffic === false) {
    return state.merge({ traffic: true })
  } else {
    return state.merge({ traffic: false })
  }
}

export const toggleMapTile = (state: Object) => {
  if (state.mapTile === false) {
    return state.merge({ mapTile: true })
  } else {
    return state.merge({ mapTile: false })
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

export const setMapTile = (state : Object, action: Object) => {
  const { mapTileName } = action
  const mapTileObj = {'Black & White': 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
                      'Basic': 'https://stamen-tiles-d.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png'
                     }

  return state.merge({ mapTileName, mapTileUrl: mapTileObj[mapTileName] })
}


/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.TOGGLE_TRAFFIC]: toggleTraffic,
  [Types.TOGGLE_MAP_TILE]: toggleMapTile,
  [Types.SET_MAX_DURATION]: setMaxDuration,
  [Types.SET_MAP_BRAND]: setMapBrand,
  [Types.SET_MAP_STYLE]: setMapStyle,
  [Types.SET_UNIT_OF_MEASUREMENT]: setUnitOfMeasurement,
  [Types.SET_MAP_TILE]: setMapTile
})
