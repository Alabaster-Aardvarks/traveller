import { self } from 'react-native-workers'
import turfHelpers from './turf/helpers'
import turfInside from './turf/inside'

const debug = false // set to true to enable log messages for debug

let savedPolygonsFeature = []

// get message from application
self.onmessage = messageString => {
  const message = JSON.parse(messageString)

  if (message.id === 'start') {
    if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'start', log: message.polygonsFeature.length })) }

    for (let index = 0; index < message.polygonsFeature.length; index++) {
      savedPolygonsFeature[index] = turfHelpers.multiPolygon(message.polygonsFeature[index].polygonArray)
    }
    placesInPolygons(message.places)
  } else {
    self.postMessage(JSON.stringify({ id: 'error', error: `unknown message: ${messageString}` }))
  }
}

const placesInPolygons = places => {
  if (!places) { return }

   let newPlaces = places.map((place, idx) => {
    let point = turfHelpers.point([ place.location.lng, place.location.lat ])
    //if (idx === 0) { console.log('point', point) }

    for (let index = 0; index < savedPolygonsFeature.length; index++) {
      let polygonFeature = savedPolygonsFeature[index]
      //if (index === 0) { console.log('polygonFeature', polygonFeature) }
      if (turfInside(point, polygonFeature)) {
        place.polygonIndex = index
        break
      }
    }

    return place
  })

  if (debug) { self.postMessage(JSON.stringify({ id: 'log', name: 'update', log: newPlaces.length })) }
  self.postMessage(JSON.stringify({ id: 'update', places: newPlaces }))
  self.postMessage(JSON.stringify({ id: 'done' }))
}
