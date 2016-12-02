import { Worker } from 'react-native-workers'
import Color from 'color'

const debug = false // set to true to enable log messages for debug

export const ISOCHRON_NOT_LOADED = 'ISOCHRON_NOT_LOADED'
export const ISOCHRON_LOADING = 'ISOCHRON_LOADING'
export const ISOCHRON_LOADED = 'ISOCHRON_LOADED'
export const ISOCHRON_ERROR = 'ISOCHRON_ERROR'
export const ISOCHRON_ABORT = 'ISOCHRON_ABORT'

export const POLYGONS_NOT_LOADED = 'POLYGONS_NOT_LOADED'
export const POLYGONS_LOADING = 'POLYGONS_LOADING'
export const POLYGONS_LOADED = 'POLYGONS_LOADED'

const isochronTimeout = 15000 // 15-second time out

let worker = null
let savedArgString = ''
let updateIsochronsState = null
let isochronSetTimeout = null

export let isochronsState = ISOCHRON_NOT_LOADED
export let polygonsState = POLYGONS_NOT_LOADED
export let savedPolygons = []
export let savedPolygonsFeature = []

const initPolygon = () => {
  savedPolygons = []
  savedPolygonsFeature = []
  polygonsState = POLYGONS_NOT_LOADED
}
const savePolygon = (index, data, length) => {
  polygonsState = POLYGONS_LOADING
  savedPolygons[index] = data // update saved isochrons

  let polygonArray = []
  data.map(d => {
    let polygon = d.polygon
    let holes = d.holes

    let polygonWithHoles = []
    let p = []
    polygon.map(c => p.push([ c.longitude, c.latitude ]))
    if (JSON.stringify(p[0]) != JSON.stringify(p[p.length-1])) { p.push(p[0]) } // close polygon if it's not
    polygonWithHoles.push(p)
    holes.map(hole => {
      let h = []
      hole.map(c => h.push([ c.longitude, c.latitude ]))
      if (JSON.stringify(h[0]) != JSON.stringify(h[h.length-1])) { h.push(h[0]) } // close polygon if it's not
      polygonWithHoles.push(h)
    })
    polygonArray.push(polygonWithHoles)
  })
  savedPolygonsFeature[index] = { index: index, polygonArray: polygonArray }

  // we are done when ALL polygons have been updated, not just one
  if (length === savedPolygonsFeature.reduce(a => a + 1, 0)) {
    polygonsState = POLYGONS_LOADED
  }
}
export const doneWithSavedPolygonsFeature = () => {
  //console.log('doneWithSavedPolygonsFeature')
  // set to null to enable garbage collection and reduce memory footprint
  savedPolygonsFeature = null
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

const checkIsochrons = () => {
  if (isochronsState === ISOCHRON_LOADING) {
    terminateIsochronWorker()
    console.tron.error('Loading isochron aborted')
    isochronsState = ISOCHRON_ABORT
    updateIsochronsState && updateIsochronsState(isochronsState)
    isochronSetTimeout && clearTimeout(isochronSetTimeout)
    isochronSetTimeout = null
  }
}

export const updateIsochrons = args => {
  const params = args.params
  const argString = JSON.stringify(params)

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
  isochronSetTimeout = setTimeout(() => checkIsochrons(), isochronTimeout)
  // create worker and send it some work
  worker = new Worker(`App/Workers/isochronWorker_${params.provider}.js`)

  worker.onmessage = messageString => {
    const message = JSON.parse(messageString)
    if (message.id === 'update') {
      if (debug) console.tron.display({ name: 'isochron update from worker', value: message.polygons.length })
      savePolygon(message.index, message.polygons, params.durations.length - 1)
    } else if (message.id === 'done') {
      isochronsState = ISOCHRON_LOADED
      updateIsochronsState && updateIsochronsState(isochronsState)
      isochronSetTimeout && clearTimeout(isochronSetTimeout)
      isochronSetTimeout = null
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

export const getIsochronDurations = duration => {
  //return [ 0, 600, 1200, 1800 ]
  duration = duration || 30 // default to 30min if not provided
  let durations = []

  // divide duration into 4 to 6 intervals (interval is a multiple of 5min)
  let interval
  for (let i = 5; i < duration; i += 5) {
    if (duration % i === 0 && (duration / i <= 6) && (duration / i >= 4)) {
      interval = i
      break
    }
  }
  if (!interval) {
    durations = [ 0, duration * 60 ]
  } else {
    for (let i = 0; i <= duration; i += interval) {
      durations.push(i * 60)
    }
  }

  if (debug) { console.tron.display({ name: 'getIsochronDurations', value: durations }) }
  return durations
}

export const isochronFillColor = (ratio, opacityFactor, buttonMode) => {
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
  let a = buttonMode ? 1.0 : 0.2 * opacityFactor * (brightness(r, g, b) / 255)
  if (buttonMode) {
    ({ r, g, b } = Color({ r, g, b }).rotate(-10).saturate(0.5).darken(0.2).rgb())
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`
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
      const message = JSON.parse(messageString)
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
  })
}
