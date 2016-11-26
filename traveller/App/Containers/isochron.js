import { Worker } from 'react-native-workers'

const debug = false

export const ISOCHRON_NOT_LOADED = 'ISOCHRON_NOT_LOADED'
export const ISOCHRON_LOADING = 'ISOCHRON_LOADING'
export const ISOCHRON_LOADED = 'ISOCHRON_LOADED'
export const ISOCHRON_ERROR = 'ISOCHRON_ERROR'

let savedArgString = ''
let isochronsState = ISOCHRON_NOT_LOADED
let updateIsochronsState = null
let worker = null

export let savedPolygons = []

const initPolygon = () => {
  savedPolygons = []
}
const savePolygon = (index, data) => {
  savedPolygons[index] = data // update saved isochrons
}
const getPolygon = index => {
  return index ? savedPolygons[index] : savedPolygons
}

export const setUpdateIsochronsStateFn = updateFn => {
  updateIsochronsState = updateFn
}
export const terminateIsochronWorker = () => {
  if (worker) {
    if (debug) console.tron.display({ name: 'terminateIsochronWorker', value: 'terminating isochron worker' })
    worker.terminate() // terminate worker if it was running
    worker = null
  }
}

export const updateIsochrons = args => {
  let params = args.params
  let argString = JSON.stringify(params)

  if (params.skip) {
    // pretend isochrons are loaded
    isochronsState = ISOCHRON_LOADED
    updateIsochronsState && updateIsochronsState(isochronsState)
    return
  }

  if (!params.force && (argString === savedArgString && (isochronsState === ISOCHRON_LOADING || isochronsState === ISOCHRON_LOADED))) {
    if (debug) console.tron.display({ name: 'updateIsochrons', value: isochronsState })
    updateIsochronsState && updateIsochronsState(isochronsState)
    return
  }
  // save arguments string
  savedArgString = argString

  isochronsState = ISOCHRON_NOT_LOADED
  updateIsochronsState && updateIsochronsState(isochronsState)
  // reset isochrons (to avoid weird display)
  initPolygon()

  terminateIsochronWorker()

  isochronsState = ISOCHRON_LOADING
  updateIsochronsState && updateIsochronsState(isochronsState)
  // create worker and send it some work
  worker = new Worker(`App/Workers/isochronWorker_${params.provider}.js`)

  worker.onmessage = messageString => {
    let message = JSON.parse(messageString)
    if (message.id === 'update') {
      if (debug) console.tron.display({ name: 'isochron update from worker', value: message.polygons.length })
      savePolygon(message.index, message.polygons)
    } else if (message.id === 'done') {
      isochronsState = ISOCHRON_LOADED
      updateIsochronsState && updateIsochronsState(isochronsState)
      terminateIsochronWorker()
    } else if (message.id === 'log') {
      console.tron.display({ name: 'Isochron worker ' + message.name, value: message.log })
    } else if (message.id === 'error') {
      console.tron.error('Isochron worker reported an error: ' + message.error)
      isochronsState = ISOCHRON_ERROR
      updateIsochronsState && updateIsochronsState(isochronsState)
      terminateIsochronWorker()
    } else {
      console.tron.error('Isochron worker unknown message: ' + messageString)
      isochronsState = ISOCHRON_ERROR
      updateIsochronsState && updateIsochronsState(isochronsState)
      terminateIsochronWorker()
    }
  }

  worker.postMessage(JSON.stringify({ id: 'start', params: params }))
}

export const isochronFillColor = (ratio, opacityFactor) => {
  let r = 255
  let g = 255
  let b = 0
  if (ratio < 1/2) {
    r = Math.ceil(255 * ratio * 2)
  } else {
    b = Math.ceil(255 * (ratio - 1/2) * 2)
    //r = Math.ceil(255 * (1 - ratio/2) * 2)
    g = Math.ceil(255 * (1 - ratio) * 2)
  }
  //let { r, g, b } = makeColorGradient(ratio * 3.14)
  let opacity = 0.2 * opacityFactor * (brightness(r, g, b) / 255)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

const brightness = (r, g, b) => {
  return Math.sqrt( 0.241 * Math.pow(r, 2) + 0.691 * Math.pow(g, 2) + 0.068 * Math.pow(b, 2) )
}

// const makeColorGradient = i => {
//   let frequency1 = 1, frequency2 = 1, frequency3 = 1
//   let phase1 = 0, phase2 = 3.14 / 2, phase3 = 3.14
//   let center = 128
//   let width = 255 - center
//
//   let red = Math.sin(frequency1 * i + phase1) * width + center
//   let grn = Math.sin(frequency2 * i + phase2) * width + center
//   let blu = Math.sin(frequency3 * i + phase3) * width + center
//
//   return { r: red, g: grn, b: blu }
// }

let checkWorker = null

export const terminateCheckIsochronAPIWorker = () => {
  if (checkWorker) {
    if (debug) console.tron.display({ name: 'terminateCheckIsochronAPIWorker', value: 'terminating checkIsochronAPI worker' })
    checkWorker.terminate() // terminate worker if it was running
    checkWorker = null
  }
}

export const checkIsochronAPI = args => {
  return new Promise((resolve, reject) => {
    let params = args.params
    if (params.durations.length > 2) {
      params.durations = params.durations.slice(0, 2)
    }

    terminateCheckIsochronAPIWorker()
    // create worker and send it some work
    checkWorker = new Worker(`App/Workers/isochronWorker_${params.provider}.js`)

    checkWorker.onmessage = messageString => {
      let message = JSON.parse(messageString)
      if (message.id === 'update') {
        if (debug) console.tron.display({ name: 'checkIsochronAPI update from worker', value: message.polygons.length })
        resolve({ polygonIndex: message.index, polygons: message.polygons })
      } else if (message.id === 'done') {
        terminateCheckIsochronAPIWorker()
      } else if (message.id === 'log') {
        console.tron.display({ name: 'checkIsochronAPI worker ' + message.name, value: message.log })
      } else if (message.id === 'error') {
        console.tron.error('checkIsochronAPI worker reported an error: ' + message.error)
        terminateCheckIsochronAPIWorker()
        reject({ error: message.error })
      } else {
        console.tron.error('checkIsochronAPI worker unknown message: ' + messageString)
        terminateCheckIsochronAPIWorker()
        reject({ error: messageString })
      }
    }

    checkWorker.postMessage(JSON.stringify({ id: 'start', params: params }))
  }
}
