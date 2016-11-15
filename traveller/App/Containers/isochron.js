import { Worker } from 'react-native-workers'

export const ISOCHRON_NOT_LOADED = 'ISOCHRON_NOT_LOADED'
export const ISOCHRON_LOADING = 'ISOCHRON_LOADING'
export const ISOCHRON_LOADED = 'ISOCHRON_LOADED'

let savedArgString = ''
let savedPolygons = []
let isochronsState = ISOCHRON_NOT_LOADED
let updatePolygonsData = null
let updateIsochronsState = null
let worker

export const setUpdateIsochronsFn = updateFn => {
  updatePolygonsData = updateFn
}
export const setUpdateIsochronsStateFn = updateFn => {
  updateIsochronsState = updateFn
}

export const updateIsochrons = args => {
  let params = args.params
  let argString = JSON.stringify(params)

  if (argString === savedArgString && (isochronsState === ISOCHRON_LOADING || isochronsState === ISOCHRON_LOADED)) {
    console.tron.display({ name: 'updateIsochrons', value: isochronsState })
    updateIsochronsState && updateIsochronsState(isochronsState)
    updatePolygonsData && updatePolygonsData(savedPolygons) // update with saved data
    return
  }
  // save arguments string
  savedArgString = argString

  isochronsState = ISOCHRON_NOT_LOADED
  updateIsochronsState && updateIsochronsState(isochronsState)
  // reset isochrons (to avoid weird display)
  savedPolygons = []
  updatePolygonsData && updatePolygonsData(savedPolygons)

  if (argString !== savedArgString) {
    worker && worker.terminate() // terminate worker if it was running
  }

  isochronsState = ISOCHRON_LOADING
  updateIsochronsState && updateIsochronsState(isochronsState)
  // create worker and send it some work
  worker = new Worker('./App/Containers/isochronWorker.js')

  worker.onmessage = messageString => {
    let message = JSON.parse(messageString)
    if (message.id === 'update') {
      console.tron.display({ name: 'isochron update from worker', value: message.polygons.length })
      savedPolygons[message.index] = message.polygons // update saved isochrons
      updatePolygonsData && updatePolygonsData(savedPolygons)
    } else if (message.id === 'done') {
      isochronsState = ISOCHRON_LOADED
      updateIsochronsState && updateIsochronsState(isochronsState)
    } else if (message.id === 'log') {
      console.tron.display({ name: 'Isochron worker ' + message.name, value: message.log })
    } else if (message.id === 'error') {
      console.tron.error('Isochron worker reported an error: ' + message.error)
    } else {
      console.tron.error('Isochron worker unknown message: ' + messageString)
    }
  }

  worker.postMessage(JSON.stringify({ id: 'start', params: params }))
}

const findColor = (ratio, opacity) => {
  var r = 255;
  var g = 255;
  if (ratio < 1/2) {
    r = Math.ceil(255 * ratio * 2);
  } else {
    g = Math.ceil(255 * (1 - ratio) * 2);
  }
  //var hex = sprintf('%02x%02x%02x', r, g, 0);
  return `rgba(${r}, ${g}, 0, ${opacity})`;
};

export const isochronFillColor = (index, opacity) => {
  return findColor(index / 5.0, opacity);
}
