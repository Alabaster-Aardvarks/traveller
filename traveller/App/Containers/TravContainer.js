import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { ScrollView, View, StyleSheet, Text, Dimensions, Slider, StatusBar } from 'react-native'
import { Actions as NavigationActions } from 'react-native-router-flux'
import MapView from 'react-native-maps'
import ActionButton from 'react-native-action-button'
import Spinner from 'react-native-spinkit'
import Icon from 'react-native-vector-icons/FontAwesome'
import AlertMessage from '../Components/AlertMessage'
import { calculateRegion } from '../Lib/MapHelpers'
import MapCallout from '../Components/MapCallout'
import styles from './Styles/TravContainerStyle'
import { updateIsochrons, setUpdateIsochronsStateFn, savedPolygons, terminateIsochronWorker,
         isochronFillColor, ISOCHRON_NOT_LOADED, ISOCHRON_LOADING, ISOCHRON_LOADED, ISOCHRON_ERROR } from './isochron'
import { getPlaces, savedPlaces, placesTypes, convertDayHourMinToSeconds } from './places'

const debug = false // enable log messages for debug

const COORDINATE_PRECISION = 0.001 // degrees
const DATETIME_PRECISION = 60 // seconds
const roundCoordinate = coord => {
  return ( Math.round( Math.abs(coord) / COORDINATE_PRECISION ) * COORDINATE_PRECISION ) * Math.sign(coord)
}
const roundDateTime = dateTime => {
  let date = (dateTime === 'now') ? new Date() : new Date(dateTime)
  // getTime() gives us milliseconds
  date.setTime( Math.round( date.getTime() / (DATETIME_PRECISION * 1000) ) * (1000 * DATETIME_PRECISION) )
  return date.toISOString()
}
const DATETIME = roundDateTime('now') // '2016-11-09T18:49:27.000Z'
const LATITUDE_DELTA = roundCoordinate(0.1)
const DURATIONS = [ 0, 600, 1200, 1800, 2400, 3600, 4200, 4800 ]
const DOWNSAMPLING_COORDINATES = { 'navitia': 5, 'here': 0, 'graphhopper': 5, 'route360': 5 } // keep 1 point out of every N
const FROM_TO_MODE = 'from' // [from,to]
const TRANSPORT_MODE = 'car' // [car,bike,walk,transit]
const TRAFFIC_MODE = 'enabled' // [enabled,disabled] HERE API only, enable always
const ISOCHRON_PROVIDER = 'here' // [navitia,here,route360,graphhopper]

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// temporary position until we get the current location
let currentPosition = { latitude: 37.7825177, longitude: -122.4106772 }

let skipIsochrons = false // set to true to disable loading isochrons [for debug]

const updateLocationIsochrons = (context, animateToRegion, newPosition) => {
  // get current location
  navigator.geolocation.getCurrentPosition(position => {
    if (newPosition) { position = newPosition }
    currentPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude }
    if (debug) console.tron.display({ name: 'current position', value: currentPosition })
    let locations = [ {
      title: 'Starting Location',
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
    } ]

    // isochron parameters
    let params = {
      provider: ISOCHRON_PROVIDER,
      latitude: roundCoordinate(locations[0].latitude),
      longitude: roundCoordinate(locations[0].longitude),
      durations: context ? context.state.isochronDurations : DURATIONS,
      dateTime: context ? roundDateTime(context.state.dateTime) : DATETIME,
      downSamplingCoordinates: context ? context.state.downSamplingCoordinates[ISOCHRON_PROVIDER] : DOWNSAMPLING_COORDINATES[ISOCHRON_PROVIDER],
      fromTo: context ? context.state.fromTo : FROM_TO_MODE,
      transportMode: context ? context.state.transportMode : TRANSPORT_MODE,
      trafficMode: TRAFFIC_MODE,
      skip: skipIsochrons
    }

    Object.keys(placesTypes).map(type => {
      placesTypes[type] && getPlaces(type, currentPosition)
    })

    if (!context) {
      updateIsochrons({ params: params })
    } else {
      let initialPosition = JSON.stringify(position)
      let newRegion = {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }
      context.setState({ initialPosition })
      context.setState({ locations })
      context.setState({ region: newRegion })
      animateToRegion && context.refs.map.animateToRegion(newRegion, 500)
      context.updatePolygons.call(context, { isochrons: params })
    }
  },
  error => console.tron.error(error),
  { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
)}

// start loading isochron as soon as we have the current location
updateLocationIsochrons()

class TravContainer extends React.Component {
  constructor (props: Object) {
    super(props)
    this.state = {
      initialPosition: 'unknown',
      lastPosition: 'unknown',
      region: {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      locations: [],
      showUserLocation: true,
      isochronDurations: DURATIONS,
      polygonsState: ISOCHRON_NOT_LOADED,
      polygonsFillColor: [...Array(DURATIONS.length - 1)].map(() => 1),
      dateTime: DATETIME,
      downSamplingCoordinates: DOWNSAMPLING_COORDINATES,
      fromTo: FROM_TO_MODE,
      transportMode: TRANSPORT_MODE,
      networkActivityIndicatorVisible: false,
      spinnerVisible: true,
      sliderVisible: false,
      sliderValue: 0,
      placesTypes: {},
    }
  }

  componentDidMount() {
    setUpdateIsochronsStateFn(this.updatePolygonsState.bind(this))
    updateLocationIsochrons(this, true)
  }

  componentWillUnmount () {
    setUpdateIsochronsStateFn(null)
    terminateIsochronWorker()
  }

  updatePolygons (params) {
    this.setState({ networkActivityIndicatorVisible: true, spinnerVisible: true })
    updateIsochrons({ params: params.isochrons })
  }

  updatePolygonsState (state) {
    this.setState({ polygonsState: state })
    this.setState({ networkActivityIndicatorVisible: (state === ISOCHRON_LOADING) ? true : false })
    let context = this
    if (state === ISOCHRON_ERROR) {
      context.setState({ spinnerVisible: false })
      alert('No isochrons found for this location.')
    } else if (state === ISOCHRON_LOADED) {
      // delay the removal of the spinner overlay to give time for the isochrons to appear
      setTimeout(() => { context.setState({ spinnerVisible: false }) }, 150)
    } else {
      this.setState({ spinnerVisible: true })
    }
  }

  calloutPress (location) {
    if (debug) console.tron.display({ name: 'calloutPress location', value: location })
  }

  renderMapMarkers (place, index, type) {
    let location = {}
    let pinColor = 'rgba(21, 107, 254, 0.9)'
    if (!type) {
      location = place
    } else {
      let placeTravelTime = convertDayHourMinToSeconds(place.time)
      if (this.state.sliderValue > 0) {
        if (placeTravelTime < this.state.isochronDurations[this.state.sliderValue - 1] ||
            placeTravelTime > this.state.isochronDurations[this.state.sliderValue]) {
          return undefined
        }
      } else {
        if (placeTravelTime > this.state.isochronDurations[this.state.isochronDurations.length - 1]) {
          return undefined
        }
      }
      location.title = `${place.name} - ${place.time}`
      location.latitude = place.location.lat
      location.longitude = place.location.lng
      pinColor = type === 'bank'    ? 'rgba(160, 57, 175, 0.9)' :
                 type === 'transit' ? 'rgba(6, 142, 219, 0.9)'  :
                 type === 'health'  ? 'rgba(255, 71, 87, 0.9)'  : 'rgba(100, 100, 100, 0.9)'
    }

    return (
      <MapView.Marker
        pinColor={pinColor}
        draggable={ type || index !== 0 ? false : true}
        key={location.title}
        coordinate={{ latitude: location.latitude, longitude: location.longitude }}
        onDragEnd={ type || index !== 0 ? undefined : e => {
          let newRegion = this.state.region
          newRegion.latitude = e.nativeEvent.coordinate.latitude
          newRegion.longitude = e.nativeEvent.coordinate.longitude
          this.refs.map.animateToRegion(newRegion, 500)
        }}
      >
        <MapCallout location={location} onPress={this.calloutPress} />
      </MapView.Marker>
    )
  }

  onRegionChangeComplete (region) {
    this.setState({ region }) // Update region when map is finishing dragging
  }

  sliderValueChange (value) {
    let polygonsFillColor = [...Array(this.state.isochronDurations.length - 1)].map(() => 1)
    if (value > 0) {
      polygonsFillColor[value - 1] = 2
    }
    //if (debug) console.tron.display({ name: 'polygonsFillColor', value: polygonsFillColor })
    this.setState({ polygonsFillColor: polygonsFillColor, sliderValue: value })
  }

  changePlacesType (type) {
    let placesTypes = this.state.placesTypes
    placesTypes[type] = placesTypes[type] ? false : true
    this.setState({ placesTypes: placesTypes })
  }

  onMapLongPress ({ coordinate }) {
    console.tron.display({ name: 'onMapLongPress', value: coordinate })
    let newPosition = { coords: coordinate }
    updateLocationIsochrons(this, true, newPosition)
  }

  // mapTileToMapTileUrl (mapTile) {
  //   const mapTileObj = {'Black & White': 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
  //                       'Basic': 'https://stamen-tiles-d.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png'
  //                      }
  //         return mapTileObj[mapTile]
  // }

  render () {
    const { traffic, mapBrand, mapStyle, mapTile, mapTileName, mapTileUrl } = this.props
    // wait for all polygons to be loaded
    const polygonsCount = (!savedPolygons || this.state.polygonsState !== ISOCHRON_LOADED) ? 0 : savedPolygons.length

    return (
      <View style={styles.container}>
        <StatusBar networkActivityIndicatorVisible={this.state.networkActivityIndicatorVisible} />
        <MapView
          ref='map'
          provider={mapBrand === 'Google Maps' ? MapView.PROVIDER_GOOGLE : MapView.PROVIDER_DEFAULT}
          showsTraffic={traffic}
          style={styles.map}
          initialRegion={this.state.region}
          onRegionChangeComplete={this.onRegionChangeComplete.bind(this)}
          onLongPress={ e => this.onMapLongPress.call(this, e.nativeEvent) }
          showsUserLocation={this.state.showUserLocation}
          showsCompass={true}
          showsScale={true}
          loadingEnabled={true}
          mapType={mapStyle.toLowerCase()}
        >
          { mapTile ?
            <MapView.UrlTile
              /**
              * The url template of the tile server. The patterns {x} {y} {z} will be replaced at runtime
              * For example, http://c.tile.openstreetmap.org/{z}/{x}/{y}.png
              */
              // urlTemplate={'https://stamen-tiles-d.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png'}
              // urlTemplate={'https://tangrams.github.io/carousel/?tron{z}/{x}/{y}'}
              urlTemplate={mapTileUrl}
            />
            : undefined
          }
          { Object.keys(this.state.placesTypes).map(type => {
              return (!this.state.placesTypes[type] || !savedPlaces[type] || savedPlaces[type].length === 0) ? undefined : savedPlaces[type].map((place, index) => this.renderMapMarkers.call(this, place, index, type))
            })
          }
          { polygonsCount === 0 ? undefined : savedPolygons.map((pArray, arrayIndex) => {
              return (pArray.length === 0) ? undefined : pArray.map((p, index) => {
                return (
                  <MapView.Polygon
                    coordinates={ p.polygon }
                    holes={ p.holes }
                    fillColor={ isochronFillColor((arrayIndex + 1) / (savedPolygons.length + 1), this.state.polygonsFillColor[arrayIndex]) }
                    strokeWidth={ 0.4 * (1 + (this.state.polygonsFillColor[arrayIndex] - 1) * 3) }
                    strokeColor={ 'rgba(85, 85, 85, 0.5)' }
                    key={ arrayIndex * 1000 + index }
                  />
                )
              })
            })
          }
          { this.state.locations.map((location, index) => this.renderMapMarkers.call(this, location, index)) }
        </MapView>

        { this.state.sliderVisible && (
            <Slider
              minimumValue={ 0 }
              maximumValue={ Math.max(1, this.state.isochronDurations.length - 1) }
              step={ 1 }
              style={{ position: 'absolute', right: 200, left: -125, top: 250, bottom: 100, height: 50, transform: [{ rotate: '270deg' }] }}
              value={ this.state.sliderValue }
              onValueChange={this.sliderValueChange.bind(this)}
            />
          )
        }

        <ActionButton buttonColor='rgba(231,76,60,1)'
          degrees={90}
          icon={<Icon name='search' style={styles.actionButton}></Icon>}
          spacing={10}
          verticalOrientation='up'
          offsetY={10}
        >
          <ActionButton.Item buttonColor='#9b59b6' title='Banks' onPress={() => this.changePlacesType.call(this, 'bank')}>
            <Icon name='university' style={styles.actionButtonIcon}/>
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#3498db' title='Transit' onPress={() => this.changePlacesType.call(this, 'transit')}>
            <Icon name='bus' style={styles.actionButtonIcon} />
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#ff6b6b' title='Medical' onPress={() => this.changePlacesType.call(this, 'health')}>
            <Icon name='ambulance' style={styles.actionButtonIcon}/>
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#1abc9c' title='Slider' onPress={() => {this.setState({ sliderVisible: !this.state.sliderVisible })}}>
            <Icon name='info-circle' style={styles.actionButtonIcon}/>
          </ActionButton.Item>
        </ActionButton>

        { this.state.spinnerVisible && (
            <View style={styles.spinnerContainer} key={2}>
              <Spinner style={styles.spinner} size={75} type={'Circle'} color={'#ffffff'} />
              <Text style={styles.spinnerText}>Loading isochrones...</Text>
            </View>
          )
        }

      </View>
    )
  }
}

TravContainer.propTypes = {
  traffic: PropTypes.bool,
  mapBrand: PropTypes.string,
  mapStyle: PropTypes.string,
  mapTile: PropTypes.bool,
  mapTileName: PropTypes.string,
  mapTileUrl: PropTypes.string
}

const mapStateToProps = (state) => {
  return {
    traffic: state.map.traffic,
    mapBrand: state.map.mapBrand,
    mapStyle: state.map.mapStyle,
    mapTile: state.map.mapTile,
    mapTileName: state.map.mapTileName,
    mapTileUrl: state.map.mapTileUrl
  }
}

const mapDispatchToProps = (dispatch) => { return {} }

export default connect(mapStateToProps, mapDispatchToProps)(TravContainer)
