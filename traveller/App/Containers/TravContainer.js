// @flow

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { View, StyleSheet, Text, Dimensions, StatusBar, VibrationIOS, Image, Linking } from 'react-native'
import { Actions as NavigationActions } from 'react-native-router-flux'
import MapView from 'react-native-maps'
import ActionButton from 'react-native-action-button'
import Spinner from 'react-native-spinkit'
import Icon from 'react-native-vector-icons/FontAwesome'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { BlurView } from 'react-native-blur'
import moment from 'moment'
import AlertMessage from '../Components/AlertMessage' // TODO: Also delete component
import MapCallout from '../Components/MapCallout'
import { MapActions } from '../Redux/MapRedux'
import ReduxPersist from '../Config/ReduxPersist'
import styles from './Styles/TravContainerStyle'
import { Images, Colors } from '../Themes'
import { updateIsochrons, setUpdateIsochronsStateFn, savedPolygons,
         terminateIsochronWorker, isochronFillColor, getIsochronDurations,
         ISOCHRON_NOT_LOADED, ISOCHRON_LOADING, ISOCHRON_LOADED, ISOCHRON_ERROR, ISOCHRON_ABORT } from './isochron'
import { loadPlaces, savedPlaces, setUpdatePlacesStateFn,
         PLACES_NOT_LOADED, PLACES_LOADING, PLACES_INDEXED } from './places'
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete' TODO: Remove me?? Unlink with RN
import AppIntro from 'react-native-app-intro'
import * as Helpers from './helpers'

const debug = false // set to true to enable log messages for debug

const COORDINATE_PRECISION = 0.001 // degrees
const DATETIME_PRECISION = 60 // seconds
const roundCoordinate = (coord) => {
  return (Math.round(Math.abs(coord) / COORDINATE_PRECISION) * COORDINATE_PRECISION) * Math.sign(coord)
}
const getDateTime = (dateTime) => {
  const date = (dateTime === 'now') ? new Date() : new Date(dateTime)
  return date.toISOString()
}
const roundDateTime = (dateTime) => {
  const date = (dateTime === 'now') ? new Date() : new Date(dateTime)
  // getTime() gives us milliseconds
  date.setTime(Math.round(date.getTime() / (DATETIME_PRECISION * 1000)) * (1000 * DATETIME_PRECISION))
  return date.toISOString()
}
const DATETIME = getDateTime('now') // '2016-11-09T18:49:27.000Z'
const LATITUDE_DELTA = roundCoordinate(0.1)
const DURATIONS = [ 0, 600, 1200, 1800, 2400, 3000, 3600 ] // equitemporal intervals in seconds //TODO: Remove? Unused anywhere
const DOWNSAMPLING_COORDINATES = { 'navitia': 5, 'here': 0, 'graphhopper': 5, 'route360': 5 } // keep 1 point out of every N //TODO: Can we remove extra quotes around key?
const TRAFFIC_MODE = 'enabled' // [enabled,disabled] HERE API only, enable always

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

let savedMapBrand = null
let savedDuration = null
let savedFromTo = null
let onRegionChangeCompleteCounter = 0
let refreshMomentInterval = null
let isochronsNeedToLoad = true
let delayTutorial = true

// temporary position until we get the current location
let currentPosition = { latitude: 37.7825177, longitude: -122.4106772 }

const transportModeInfo = {
  // isochrone provider: [navitia,here,route360,graphhopper]
  // radius in meters
  'walk'    : { provider: 'here',    radius: 15000, icon: 'md-walk',    appleMaps: 'w', googleMaps: 'walking'   },
  'bike'    : { provider: 'navitia', radius: 25000, icon: 'md-bicycle', appleMaps: 'w', googleMaps: 'bicycling' },
  'car'     : { provider: 'here',    radius: 50000, icon: 'car',        appleMaps: 'd', googleMaps: 'driving'   },
  'transit' : { provider: 'navitia', radius: 50000, icon: 'train',      appleMaps: 'r', googleMaps: 'transit'   },
}

const placesInfo = {
  // size: how many places are requested (fewer or equal to 200)
  'food'    : { enabled: true, visible: false, size: 25, buttonColor: Colors.purpleLight,     buttonTitle: 'Food',    icon: 'cutlery',   image: Images.food    },
  'health'  : { enabled: true, visible: false, size: 25, buttonColor: Colors.watermelonLight, buttonTitle: 'Medical', icon: 'ambulance', image: Images.medical },
  'museums' : { enabled: true, visible: false, size: 25, buttonColor: Colors.yellowLight,     buttonTitle: 'Museums', icon: 'bank',      image: Images.museums },
  'park'    : { enabled: true, visible: false, size: 25, buttonColor: Colors.greenLight,      buttonTitle: 'Parks',   icon: 'tree',      image: Images.park    },
  'transit' : { enabled: true, visible: false, size: 25, buttonColor: Colors.orangeLight,     buttonTitle: 'Transit', icon: 'bus',       image: Images.transit },
}

const getPosition = l => {
  return { coords: { latitude: roundCoordinate(l.latitude), longitude: roundCoordinate(l.longitude) } }
}

const skipIsochrons = false // set to true to disable loading isochrons [for debug]

class TravContainer extends React.Component {
  state: Object
  constructor(props: Object) {
    super(props)
    const durations = getIsochronDurations(props.duration)
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
      polygonsState: ISOCHRON_NOT_LOADED,
      polygonsFillColor: [...Array(durations.length - 1)].map(() => 1),
      placesState: PLACES_NOT_LOADED,
      dateTime: DATETIME,
      refreshMoment: moment(DATETIME).fromNow(),
      durations,
      downSamplingCoordinates: DOWNSAMPLING_COORDINATES,
      networkActivityIndicatorVisible: false,
      spinnerVisible: true,
      placesInfo,
      searchBarVisible: false,
      centerButtonVisible: false,
      centerButtonMask: true,
      uiElementsVisible: false,
      refreshEnabled: false,
    }
  }

  componentDidMount() {
    setUpdateIsochronsStateFn(this.updatePolygonsState.bind(this))
    setUpdatePlacesStateFn(this.updatePlacesState.bind(this))
  }

  componentDidUpdate() {
    // console.log('componentDidUpdate')
    if (!ReduxPersist.active) { return }
    // console.log('componentDidUpdate in')

    const { duration, travelTimeName, tutorialHasRun } = this.props

    // console.log('componentDidUpdate', this.state.refreshEnabled, this.state.refreshMoment)
    if ((savedDuration && duration !== savedDuration) || (savedFromTo && travelTimeName !== savedFromTo)) {
      // NOTE: savedDuration and savedFromTo are updated inside updateLocationIsochrons, but they need to be updated here
      //       to avoid infinite loops when getting subsequent componentDidUpdate calls
      savedDuration = duration
      savedFromTo = travelTimeName
      // reload isochrones when duration changes, no animate to region, no position change, isochrones reload, update date to now
      this.updateLocationIsochrons(false, 'current', true, true)
      this.polygonsFillColorUpdate()
    }

    if (tutorialHasRun && isochronsNeedToLoad) {
      isochronsNeedToLoad = false
      // load isochrones, animate to region,  isochrones reload, update date to now
      this.updateLocationIsochrons(true, undefined, true, true)
    }
  }

  componentWillUnmount() {
    setUpdateIsochronsStateFn(null)
    setUpdatePlacesStateFn(null)
    terminateIsochronWorker()
  }

  // use 'undefined' for newPosition to center on GPS location
  updateLocationIsochrons(animateToRegion, newPosition, isochronsUpdate, dateUpdate) {
    let dateTime = this.state.dateTime
    if (dateUpdate) {
      dateTime = getDateTime('now')
      this.setState({ dateTime })
    }
    if (newPosition === 'current') {
      const { locations } = this.state
      newPosition = getPosition(locations[0]) // TODO: Reassigning param here
    }

    return new Promise((resolve, reject) => { // TODO: Not using reject here or catch
      newPosition ? resolve(newPosition) : navigator.geolocation.getCurrentPosition(position => resolve(position))
    })
    .then((position) => {
      // update global var
      currentPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      if (debug) console.tron.display({ name: 'current position', value: currentPosition })

      const locations = [{
        title: 'Center Location', // isochron center location
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
      }]
      const newRegion = {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }
      const { duration, travelTimeName } = this.props
      const durations = getIsochronDurations(duration)
      savedDuration = duration // update saved duration
      savedFromTo = travelTimeName // updated saved fromTo
      if (isochronsUpdate) {
        const initialPosition = JSON.stringify(position)
        this.setState({ initialPosition })
        this.setState({ locations })
        this.setState({ region: newRegion })
        this.setState({ durations })
        savedMapBrand = this.props.mapBrand
      }

      animateToRegion && this.refs.map.animateToRegion(newRegion, 500)

      if (isochronsUpdate) {
        // Isochrone parameters
        const { transportMode, travelTimeName } = this.props // TODO: travelTimeName is already declared above
        const isochronProvider = transportModeInfo[transportMode].provider
        const p = getPosition(locations[0])
        const params = {
          provider: isochronProvider || 'here', // default to 'here' if not provided
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          durations,
          dateTime: roundDateTime(dateTime),
          downSamplingCoordinates: this.state.downSamplingCoordinates[isochronProvider],
          fromTo: travelTimeName || 'from', // default to 'from' if not provided
          transportMode: transportMode || 'walk', // default to 'walk' if not provided
          trafficMode: TRAFFIC_MODE,
          skip: skipIsochrons,
        }
        this.updatePolygons({ isochrons: params })
      }
    },
    error => console.error(error),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
  ) }

  updatePolygons(params) {
    this.setState({ networkActivityIndicatorVisible: true, spinnerVisible: true })
    updateIsochrons({ params: params.isochrons })
  }

  updatePlaces() {
    this.setState({ networkActivityIndicatorVisible: true })
    const { placesInfo, locations } = this.state // TODO: placesInfo is already declared above
    const { transportMode } = this.props
    const position = getPosition(locations[0])
    const params = {
      placesInfo,
      position,
      mode: transportMode,
      radius: transportModeInfo[transportMode].radius,
      date: roundDateTime(this.state.dateTime),
    }
    loadPlaces({ params })
  }

  updatePolygonsState(state) {
    this.setState({ polygonsState: state })
    this.updateNetworkActivityIndicator(state === ISOCHRON_LOADING)
    if (state === ISOCHRON_ERROR) {
      this.setState({ spinnerVisible: false })
      alert('Could not load isochrones for this location')
    } else if (state === ISOCHRON_ABORT) {
      this.setState({ spinnerVisible: false })
      alert('Loading isochrones for this location timed out')
    } else if (state === ISOCHRON_LOADED) {
      this.updatePlaces() // update places
      // delay the removal of the spinner overlay to give time for the isochrons to appear
      const context = this
      setTimeout(() => { context.setState({ spinnerVisible: false }) }, 150)
    } else {
      this.setState({ spinnerVisible: true })
      this.updatePlacesState(PLACES_NOT_LOADED)
    }
  }

  updatePlacesState (state) {
    this.setState({ placesState: state })
    this.updateNetworkActivityIndicator(state === PLACES_LOADING)
  }

  updateNetworkActivityIndicator (value) {
    const { polygonsState, placesState } = this.state
    const loading = value || polygonsState === ISOCHRON_LOADING || placesState === PLACES_LOADING
    this.setState({ networkActivityIndicatorVisible: loading ? true : false })
  }

  calloutPress (location, event) {
    //console.log('calloutPress', location)
    if (debug) console.tron.display({ name: 'calloutPress location', value: location })
    if (location.url) {
      if (location.url.match(/apple/) && event) { return }
      const testUrl = location.url.replace(/^(comgooglemaps:\/\/).*/, '$1')
      //console.log('testUrl', testUrl)
      Linking.canOpenURL(testUrl).then(supported => {
        if (!supported) {
          if (debug) console.tron.display('Cannot handle url: ' + location.url)
        } else {
          return Linking.openURL(location.url)
        }
      })
      .catch(err => console.error('An error occurred', err))
    }
  }

  // searchTogglePressed () {
  //   if (debug) console.tron.log('Pressed!');
  //   return (
  //     <SearchBar
  //       placeholder='Search'
  //       textFieldBackgroundColor='blue'
  //     />
  //   )
  // }

  renderMapMarkers (place, index, type, keyTag) {
    const { unitOfMeasurement, mapBrand, transportMode } = this.props
    let location = {}
    let pinImage = Images.main
    if (!type) {
      location = place
    } else {
      const distance = unitOfMeasurement === 'Miles' ? place['distance'] : (Math.round(place['metric distance'] / 100) / 10 ) + ' km'
      const name = place.name.replace(/^([^,]*),.*$/, '$1')
      location.title = name
      location.subtitle = `${place.time} - ${distance}`
      location.latitude = place.location.lat
      location.longitude = place.location.lng
      location.url = (mapBrand === 'Google Maps' ?
                       'comgooglemaps://?q=' + place.name
                       + '&directionsmode=' + transportModeInfo[transportMode].googleMaps
                       + '&center=' :
                       'http://maps.apple.com/?q=' + place.name
                       + '&dirflg=' + transportModeInfo[transportMode].appleMaps
                       + '&ll='
                     )
                     + `${location.latitude},${location.longitude}`
      if (place.polygonIndex === undefined) {
        return undefined // skip places which do not have a polygon index
      }
      if (this.state.polygonsFillColor.indexOf(2) !== -1) {
        if (place.polygonIndex !== undefined && this.state.polygonsFillColor[place.polygonIndex] !== 2) { return undefined }
      }
      pinImage = placesInfo[type].image
    }

    return (
      <MapView.Marker
        // pinColor={pinColor}
        image={pinImage}
        anchor={{ x: 0.5, y: 1 }}
        centerOffset={{ x: 0, y: -18 }}
        draggable={type || index !== 0 ? false : true} // Not friendly with MapView long-press refresh
        key={`${location.title}-${index}${keyTag}-${unitOfMeasurement}`}
        coordinate={{ latitude: location.latitude, longitude: location.longitude }}
        onDragEnd={type || index !== 0 ? undefined : (e) => {
          const newRegion = this.state.region
          newRegion.latitude = e.nativeEvent.coordinate.latitude
          newRegion.longitude = e.nativeEvent.coordinate.longitude
          this.refs.map.animateToRegion(newRegion, 500)
        }}
      >
        <MapCallout location={location} onPress={this.calloutPress} />
      </MapView.Marker>
    )
  }

  onRegionChangeComplete(region) {
    const { mapBrand } = this.props
    if (savedMapBrand && savedMapBrand !== mapBrand) {
      this.refs.map && this.refs.map.animateToRegion(this.state.region, 0) // TODO: this.refs deprecated https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/no-string-refs.md
      // hack to avoid region change when changing map brand
      // a map brand change triggers two onRegionChangeComplete events
      onRegionChangeCompleteCounter++
      if (onRegionChangeCompleteCounter > 1) {
        onRegionChangeCompleteCounter = 0
        savedMapBrand = mapBrand
      }
    } else {
      if (JSON.stringify(region) !== JSON.stringify(this.state.region)) {
        this.setState({ region }) // Update region when map is finishing dragging
        if (this.state.centerButtonMask) {
          this.setState({ centerButtonMask: false })
        } else {
          this.setState({ centerButtonVisible: true })
        }
      }
    }
  }

  polygonsFillColorUpdate(index) {
    let polygonsFillColor = this.state.polygonsFillColor

    if (index === undefined) { // reset all colors
      polygonsFillColor = [...Array(this.state.durations.length - 1)].map(() => 1)
    } else {
      if (index === 0) { // if any color is highlighted, disable all, otherwise enable all
        const v = (polygonsFillColor.indexOf(2) !== -1) ? 1 : 2
        polygonsFillColor = [...Array(this.state.durations.length - 1)].map(() => v)
      } else { // switch the corresponding isochron
        polygonsFillColor[index - 1] = (polygonsFillColor[index - 1] === 1) ? 2 : 1
      }
    }

    // if (debug) console.tron.display({ name: 'polygonsFillColor', value: polygonsFillColor })
    this.setState({ polygonsFillColor })
  }

  changePlacesInfo(type) {
    let { placesInfo } = this.state // TODO: placesInfo is already declared above
    placesInfo[type].visible = placesInfo[type].visible ? false : true // TODO: styleguide doesn't like this (we can override though) http://eslint.org/docs/rules/no-unneeded-ternary
    this.setState({ placesInfo })
  }

  onMapLongPress({ coordinate }) {
    if (debug) console.tron.display({ name: 'onMapLongPress', value: coordinate })
    const newPosition = { coords: coordinate }
    // animate to region, position update, isochrones reload, update date to now
    this.updateLocationIsochrons(true, newPosition, true, true)
    VibrationIOS.vibrate()
  }

  render() {
    // console.log('render in')
    if (!ReduxPersist.active) { return null }
    delayTutorial && setTimeout( () => { delayTutorial = false }, 150) // FIXME: hack
    // console.log('render in')

    const { traffic, mapBrand, mapStyle, mapTile, mapTileName, mapTileUrl, travelTimeName, // TODO: travelTimeName, transportMode, placesInfo already declared above
            transportIcon, setTransportMode, transportMode, tutorialHasRun, toggleTutorialHasRun } = this.props
    const { polygonsState, placesState, placesInfo, refreshMoment, refreshEnabled } = this.state
    // wait for all polygons to be loaded
    const polygonsCount = (!savedPolygons || polygonsState !== ISOCHRON_LOADED) ? 0 : savedPolygons.length
    // places indexed
    const placesReady = placesState === PLACES_INDEXED
    // make sure we re-render when all places have been indexed
    const placesKeyTag = placesState === PLACES_INDEXED ? '-indexed' : undefined
    // console.log('render', tutorialHasRun)

    return (
      <View style={styles.container}>

        <StatusBar networkActivityIndicatorVisible={this.state.networkActivityIndicatorVisible} />
        <MapView
          ref="map"
          key={`${mapBrand}-${mapStyle}` + (mapTile ? `-${mapTileName}` : '')} // TODO: No '+' in templates, just a single template http://eslint.org/docs/rules/prefer-template
          provider={mapBrand === 'Google Maps' ? MapView.PROVIDER_GOOGLE : MapView.PROVIDER_DEFAULT}
          showsTraffic={traffic}
          style={styles.map}
          initialRegion={this.state.region}
          onRegionChangeComplete={this.onRegionChangeComplete.bind(this)} // TODO: Can we fix this? https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/jsx-no-bind.md
          onPress={() => this.setState({ uiElementsVisible: !this.state.uiElementsVisible })}
          onLongPress={e => this.onMapLongPress.call(this, e.nativeEvent)}
          showsUserLocation={this.state.showUserLocation}
          showsCompass
          showsScale
          loadingEnabled={false}
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

          {/* Isochrones */}
          { polygonsCount === 0 ? undefined : savedPolygons.map((pArray, arrayIndex) => { // TODO: I'm not sure I agree with this rule http://eslint.org/docs/rules/arrow-body-style
            return (pArray.length === 0) ? undefined : pArray.map((p, index) => {
              return (
                <MapView.Polygon
                  coordinates={p.polygon}
                  holes={p.holes}
                  fillColor={isochronFillColor((arrayIndex + 1) / (savedPolygons.length + 1), this.state.polygonsFillColor[arrayIndex])}
                  strokeWidth={0.4 * (1 + (this.state.polygonsFillColor[arrayIndex] - 1) * 3)}
                  strokeColor={'rgba(85, 85, 85, 0.5)'}
                  key={(arrayIndex * 1000) + index}
                />
              )
            })
          })
          }

          {/* Places Markers */}
          { Object.keys(placesInfo).map(type => {
            return (!placesReady || !placesInfo[type].visible || !savedPlaces[type] || savedPlaces[type].length === 0) ?
              undefined :
              savedPlaces[type].map((place, index) => this.renderMapMarkers.call(this, place, index, type, placesKeyTag))
          })
          }

          {/* Isochrone Center Marker */}
          { this.state.locations.map((location, index) => this.renderMapMarkers.call(this, location, index, undefined, placesKeyTag)) }
        </MapView>

        {/* Search Menu */}
        { !this.state.uiElementsVisible && (
          <ActionButton
            key="search"
            buttonColor={Colors.redLight}
            btnOutRange={Colors.redDark}
            degrees={0}
            icon={<Icon name="search" style={styles.actionButton} />}
            spacing={10}
            outRangeScale={1.2}
            backdrop={1 ? false : <BlurView blurType="dark" blurAmount={1} style={styles.container} />} // TODO: http://eslint.org/docs/rules/no-constant-condition
            onPress={() => {
              const enabled = ((polygonsCount !== 0) && (new Date().getTime() - new Date(this.state.dateTime).getTime()) < (1000 * 45)) ? false : true
              const m = moment(this.state.dateTime).fromNow()
              if (m !== refreshMoment || enabled !== refreshEnabled) {
                this.setState({ refreshMoment: m, refreshEnabled: enabled })
              }
              const context = this
              // console.log('clear refreshMomentInterval')
              refreshMomentInterval && clearInterval(refreshMomentInterval)
              // console.log('start refreshMomentInterval')
              refreshMomentInterval = setInterval(() => {
                const enabled = ((polygonsCount !== 0) && (new Date().getTime() - new Date(context.state.dateTime).getTime()) < (1000 * 45)) ? false : true // TODO: enabled already assinged above
                const m = moment(this.state.dateTime).fromNow() // TODO: m already assigned above
                if (m !== refreshMoment || enabled !== refreshEnabled) {
                  context.setState({ refreshMoment: m, refreshEnabled: enabled })
                } },
                30000,
              )
            }}
            onReset={() => {
              // console.log('clear refreshMomentInterval')
              refreshMomentInterval && clearInterval(refreshMomentInterval)
              refreshMomentInterval = null
            }}
          >
            { Object.keys(placesInfo).concat(['refresh']).map((type) => {
                if (type === 'refresh') {
                  // console.log('refresh', refreshEnabled)
                  // animate to region, no position change, isochrones reload, update date to now
                  return (
                    <ActionButton.Item
                      key={`search-refresh-${refreshEnabled}-${refreshMoment}`}
                      buttonColor={`rgba(26, 188, 156, ${refreshEnabled ? 1 : 0.4})`}
                      title={`refreshed ${refreshMoment}`}
                      titleColor={refreshEnabled ? '#444' : '#888'}
                      size={44}
                      onPress={() => {
                        if (!refreshEnabled) { return }
                        // give time for the button to close
                        const context = this
                        setTimeout(() => context.updateLocationIsochrons.call(this, true, 'current', true, true), 150)
                      }}
                    >
                      <Icon name="refresh" style={styles.actionButtonIcon} />
                    </ActionButton.Item>
                  )
                } else { // TODO: unnecessary 'else' after 'return' http://eslint.org/docs/rules/no-else-return
                  return (
                    <ActionButton.Item
                      key={`search-${type}`}
                      buttonColor={placesInfo[type].buttonColor}
                      title={placesInfo[type].buttonTitle}
                      size={44}
                      onPress={() => this.changePlacesInfo.call(this, type)}
                    >
                      <Icon name={placesInfo[type].icon} style={styles.actionButtonIcon} />
                    </ActionButton.Item>
                  )
                }
            })
            }
          </ActionButton>
          )
        }

        {/* Duration Button */}
        { !this.state.uiElementsVisible && (
          <ActionButton
            buttonColor={Colors.skyBlueLight}
            btnOutRange={Colors.skyBlueDark}
            degrees={0}
            icon={<Icon name="clock-o" style={styles.actionButton} />}
            spacing={10}
            outRangeScale={1.2}
            position="center"
            verticalOrientation="down"
            key="duration"
            autoInactive={false}
            backdrop={1 ? false : <BlurView blurType='dark' blurAmount={1} style={styles.container} />} // TODO: http://eslint.org/docs/rules/no-constant-condition
          >
              { this.state.durations.map((duration, index) => {
                const buttonEnabled = index === 0 ? false : (this.state.polygonsFillColor[index - 1] === 1 ? false : true)
                return (
                  <ActionButton.Item
                    size={44}
                    buttonColor={index === 0 ? Colors.skyBlueLight : isochronFillColor(index / this.state.durations.length, null, true)}
                    btnOutRange={Colors.skyBlueDark}
                    onPress={() => this.polygonsFillColorUpdate.call(this, index)}
                    key={`duration-${index}`}
                    style={buttonEnabled ? { borderWidth: StyleSheet.hairlineWidth * 4, borderColor: Colors.whiteLight } : undefined}
                  >
                    <Text style={styles.durationButtonText}>
                      {(index === 0) ? (this.state.polygonsFillColor.indexOf(2) !== -1 ? 'all\noff' : 'all\non') : (duration / 60).toString() + '\nmin'}
                    </Text>
                  </ActionButton.Item>
                )
              })
              }
            </ActionButton>
          )
        }

        {/* Settings Button */}
        { !this.state.uiElementsVisible && (
          <ActionButton
            key="settings"
            buttonColor={Colors.skyBlueLight}
            icon={<Icon name="cog" style={styles.actionButton} />}
            spacing={10}
            degrees={0}
            position="left"
            verticalOrientation="down"
            onPress={NavigationActions.settings}
          />
          )
        }

        {/* Transport Mode Button */}
        { !this.state.uiElementsVisible && (
          <ActionButton
            key="transport-mode"
            buttonColor={Colors.skyBlueLight}
            btnOutRange={Colors.skyBlueDark}
            icon={(transportIcon === 'md-walk' || transportIcon === 'md-bicycle') ? <Ionicons name={transportIcon} style={styles.actionModeButton} /> : <Icon name={transportIcon} style={styles.actionButton} />}
            spacing={10}
            degrees={0}
            position="right"
            verticalOrientation="down"
            autoInactive
            outRangeScale={1.2}
          >
              { Object.keys(transportModeInfo).map(transportMode => // TODO: No shadow vars http://eslint.org/docs/rules/no-shadow
                <ActionButton.Item
                  key={`transport-mode-${transportMode}`}
                  buttonColor={Colors.skyBlueLight}
                  size={44}
                  onPress={() => {
                    setTransportMode(transportMode)
                    // no animate to region, no position change, isochrones reload, update date to now
                    this.updateLocationIsochrons(false, 'current', true, true)
                  }}
                >
                  { (transportModeInfo[transportMode].icon === 'md-walk' || transportModeInfo[transportMode].icon === 'md-bicycle') ? <Ionicons name={transportModeInfo[transportMode].icon} style={styles.actionModeButton} /> : <Icon name={transportModeInfo[transportMode].icon} style={styles.actionButton} />}
                  {/* TODO: Can this line be deleted? <Ionicons name={ transportModeInfo[transportMode].icon } style={styles.actionModeButton}/> */}
                </ActionButton.Item>
                )
              }
            </ActionButton>
          )
        }

        {/* Center Map Button */}
        { this.state.centerButtonVisible && (
          <ActionButton
            key="center-map"
            buttonColor={Colors.whiteLight}
            icon={<Icon name="crosshairs" style={styles.actionButtonReverse} />}
            style={/* FIXME: style is not supported by ActionButton, could fix */
                    { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: Colors.skyBlueLight }}
            spacing={10}
            position="center"
            offsetY={45}
            size={35}
            verticalOrientation="up"
            onPress={() => { // center map on GPS location
              this.updateLocationIsochrons(true, undefined, false, false)
              this.setState({ centerButtonVisible: false, centerButtonMask: true })
            }}
            onLongPress={() => { // center map on isochrone center
              // Get current isochron center location
              this.updateLocationIsochrons(true, 'current', false, false)
              this.setState({ centerButtonVisible: false, centerButtonMask: true })
            }}
          />
          )
        }

        {/* Spinner */}
        { this.state.spinnerVisible && (
          <View style={styles.spinnerContainer} key={2}>
            <Spinner style={styles.spinner} size={75} type={'Circle'} color={Colors.whiteLight} />
            <Text style={styles.spinnerText}>Refreshing Map</Text>
          </View>
          )
        }

        {/* First Launch Tutorial */}
        { (delayTutorial ? false : !tutorialHasRun) && (
          <AppIntro
            showSkipButton={false}
            doneBtnLabel="Go!"
            onDoneBtnClick={toggleTutorialHasRun}
          >
            <View style={[styles.slide, { backgroundColor: Colors.skyBlueLight }]}>
              <View><Image source={Images.walkMarker} /></View>
              <View level={10}><Text style={styles.textTitle}>Traveller</Text></View>
              <View level={15}><Text style={styles.text}>Make the most</Text></View>
              <View level={8}><Text style={styles.text}>of your travels</Text></View>
            </View>
            <View style={[styles.slide, { backgroundColor: Colors.greenLight }]}>
              <View><Image source={Images.travMarker} /></View>
              <View level={-10}><Text style={styles.textTitle}>Isochrones</Text></View>
              <View><Text style={styles.text} /></View>
              <View level={5}><Text style={styles.text}>How far you can get</Text></View>
              <View><Text style={styles.text} /></View>
              <View level={25}><Text style={styles.text}>with the time you have</Text></View>
            </View>
            {/* <View style={[styles.slide,{ backgroundColor: '#fa931d' }]}>
              <View level={8}><Text style={styles.textTitle}>Third Slide</Text></View>
              <View level={0}><Text style={styles.text}>Traveller is</Text></View>
              <View level={-10}><Text style={styles.text}>still AWESOME!</Text></View>
            </View> */}
            {/* <View style={[styles.slide, { backgroundColor: '#a4b602' }]}>
              <View level={5}><Text style={styles.textTitle}>Fourth Slide</Text></View>
              <View level={10}><Text style={styles.text}>Oy m8</Text></View>
              <View level={15}><Text style={styles.text}>Traveller is dope.</Text></View>
            </View> */}
          </AppIntro>
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
  mapTileUrl: PropTypes.string,
  duration: PropTypes.number,
  transportMode: PropTypes.string,
  transportIcon: PropTypes.string,
  setTransportMode: PropTypes.func,
  travelTimeName: PropTypes.string,
  toggleTutorialHasRun: PropTypes.func,
  tutorialHasRun: PropTypes.bool,
  unitOfMeasurement: PropTypes.string,
}

const mapDispatchToProps = (dispatch) => {
  return {
    setTransportMode: transportModeName => dispatch(MapActions.setTransportMode(transportModeName)),
    toggleTutorialHasRun: () => dispatch(MapActions.toggleTutorialHasRun()),
  }
}

export default connect(Helpers.mapStateToProps, mapDispatchToProps)(TravContainer) // NOTE: Moved mapStateToProps to helper.js
