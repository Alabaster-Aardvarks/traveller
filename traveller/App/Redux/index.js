// @flow

import { combineReducers } from 'redux'
import configureStore from './CreateStore'
import rootSaga from '../Sagas/'

export default () => {
  /* ------------- Assemble The Reducers ------------- */
  const rootReducer = combineReducers({
    login: require('./LoginRedux').reducer,
    temperature: require('./TemperatureRedux').reducer,
    map: require('./MapRedux').reducer,
  })

  return configureStore(rootReducer, rootSaga)
}
