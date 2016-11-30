// @flow

import { combineReducers } from 'redux'
import configureStore from './CreateStore'

export default () => {
  /* ------------- Assemble The Reducers ------------- */
  const rootReducer = combineReducers({
    map: require('./MapRedux').reducer,
  })

  return configureStore(rootReducer)
}
