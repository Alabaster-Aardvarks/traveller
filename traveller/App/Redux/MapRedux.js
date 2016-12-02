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
  setMapTile: ['mapTileName'],
  setTransportMode: ['transportMode'],
  toggleTravelTime: null,
  toggleTutorialHasRun: null,
})

export const MapTypes = Types
export default Creators

/* ------------- Initial State ------------- */

const transportIconList = {
  'walk'    : 'md-walk',
  'bike'    : 'md-bicycle',
  'car'     : 'car',
  'transit' : 'bus',
}

export const INITIAL_STATE = Immutable({
  mapBrand: 'Google Maps',
  duration: 60,
  traffic: false,
  unitOfMeasurement: 'Miles',
  mapStyle: 'Standard',
  mapTile: false,
  mapTileName: 'Basic',
  mapTileUrl: 'https://stamen-tiles-d.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png',
  transportMode: 'walk',
  travelTime: false,
  travelTimeName: 'from',
  transportIcon: transportIconList['walk'],
  tutorialHasRun: false,
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
  const mapTileObj = {Toner: 'https://stamen-tiles-d.a.ssl.fastly.net/toner/{z}/{x}/{y}.png',
                      Terrain: 'https://stamen-tiles-d.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
                      Watercolor: 'https://stamen-tiles-d.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
                     }
  state.merge({ mapStyle: 'Standard' })
  return state.merge({ mapTileName, mapTileUrl: mapTileObj[mapTileName] })
}

export const setTransportMode = (state: Object, action: Object) => {
  let { transportMode } = action
  transportMode = transportMode.toLowerCase() // FIXME: is this necessary?
  return state.merge({ transportMode, transportIcon: transportIconList[transportMode] })
}

export const toggleTravelTime = (state: Object) => {
  if (state.travelTime === false) {
    return state.merge({ travelTime: true, travelTimeName: 'to' })
  } else {
    return state.merge({ travelTime: false, travelTimeName: 'from' })
  }
}

export const toggleTutorialHasRun = (state: Object) => {
  if (state.tutorialHasRun === false) {
    return state.merge({ tutorialHasRun: true })
  } else {
    return state.merge({ tutorialHasRun: false })
  }
}

/* ------------- Hookup Reducers To Types ------------- */

export const reducer = createReducer(INITIAL_STATE, {
  [Types.TOGGLE_TRAFFIC]: toggleTraffic,
  [Types.TOGGLE_MAP_TILE]: toggleMapTile,
  [Types.SET_MAX_DURATION]: setMaxDuration,
  [Types.SET_MAP_BRAND]: setMapBrand,
  [Types.SET_MAP_STYLE]: setMapStyle,
  [Types.SET_UNIT_OF_MEASUREMENT]: setUnitOfMeasurement,
  [Types.SET_MAP_TILE]: setMapTile,
  [Types.SET_TRANSPORT_MODE]: setTransportMode,
  [Types.TOGGLE_TRAVEL_TIME]: toggleTravelTime,
  [Types.TOGGLE_TUTORIAL_HAS_RUN]: toggleTutorialHasRun
})
