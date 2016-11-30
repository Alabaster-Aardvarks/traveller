import { self } from 'react-native-workers'
import turfHelpers from '@turf/helpers'
import turfInside from '@turf/inside'

const debug = true // set to true to enable log messages for debug

let savedPolygonsFeature = []

// get message from application
self.onmessage = messageString => {
  const message = JSON.parse(messageString)

  if (message.id === 'start') {
    //console.log(`Worker received start`, message.polygonsFeature.length)
    for (let index = 0; index < message.polygonsFeature.length; index++) {
      savedPolygonsFeature[index] = turfHelpers.polygon(message.polygonsFeature[index].polygon)
    }
    placesInPolygons(message.places)
  } else {
    self.postMessage(JSON.stringify({ id: 'error', error: `unknown message: ${messageString}` }))
  }
}

const placesInPolygons = places => {
  if (!places) { return }

   let newPlaces = places.map(place => {
    let point = turfHelpers.point([ place.location.lng, place.location.lat ])
    //console.log('point', point)

    for (let index = 0; index < savedPolygonsFeature.length; index++) {
      let polygonFeature = savedPolygonsFeature[index]
      //console.log(polygonFeature)
      if (turfInside(point, polygonFeature)) {
        place.polygonIndex = index
        break
      }
    }

    return place
  })

  self.postMessage(JSON.stringify({ id: 'update', places: newPlaces }))
  self.postMessage(JSON.stringify({ id: 'done' }))
}
