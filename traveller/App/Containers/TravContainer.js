import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { ScrollView, View, StyleSheet, Text, Dimensions, Slider, StatusBar, LayoutAnimation, VibrationIOS } from 'react-native'
import { Actions as NavigationActions } from 'react-native-router-flux'
import MapView from 'react-native-maps'
import ActionButton from 'react-native-action-button'
import Spinner from 'react-native-spinkit'
import Icon from 'react-native-vector-icons/FontAwesome'
import Ionicons from 'react-native-vector-icons/Ionicons'
import AlertMessage from '../Components/AlertMessage'
import { calculateRegion } from '../Lib/MapHelpers'
import MapCallout from '../Components/MapCallout'
import MapActions from '../Redux/MapRedux'
import styles from './Styles/TravContainerStyle'
import { updateIsochrons, setUpdateIsochronsStateFn, savedPolygons, savedPolygonsFeature,
         terminateIsochronWorker, doneWithSavedPolygonsFeature, isochronFillColor,
         ISOCHRON_NOT_LOADED, ISOCHRON_LOADING, ISOCHRON_LOADED, ISOCHRON_ERROR } from './isochron'
import { getPlaces, savedPlaces, convertDayHourMinToSeconds, placesInPolygonsUpdate } from './places'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
// import { Container, Header, InputGroup, Input, NBIcon, Button } from 'native-base'; Disabled for now

const debug = false // set to true to enable log messages for debug

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
const DURATIONS = [ 0, 600, 1200, 1800, 2400, 3000, 3600 ] // equitemporal intervals in seconds
const DOWNSAMPLING_COORDINATES = { 'navitia': 5, 'here': 0, 'graphhopper': 5, 'route360': 5 } // keep 1 point out of every N
const FROM_TO_MODE = 'from' // [from,to]
const TRANSPORT_MODE = 'car' // [car,bike,walk,transit]
const TRAFFIC_MODE = 'enabled' // [enabled,disabled] HERE API only, enable always

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Autocomplete Config
const homePlace = {description: 'Home', geometry: { location: { lat: 37.753185, lng: -122.439587 } }};
const workPlace = {description: 'Work', geometry: { location: { lat: 37.783697, lng: -122.408966 } }};

let savedMapBrand = null
let savedDuration = null
let onRegionChangeCompleteCounter = 0

// temporary position until we get the current location
let currentPosition = { latitude: 37.7825177, longitude: -122.4106772 }

const transportModeInfo = {
  // isochrone provider: [navitia,here,route360,graphhopper]
  // radius in meters
  'walk'    : { provider: 'here',    radius: 15000, icon: 'md-walk'    },
  'car'     : { provider: 'here',    radius: 50000, icon: 'md-car'     },
  'bike'    : { provider: 'navitia', radius: 25000, icon: 'md-bicycle' },
  'transit' : { provider: 'navitia', radius: 50000, icon: 'md-train'   },
}

const placesInfo = {
  // size: how many places are requested (fewer or equal to 200)
  'bank'    : { enabled: true, visible: false, size: 25, buttonColor: '#9b59b6', buttonTitle: 'Banks',   icon: 'university' },
  'transit' : { enabled: true, visible: false, size: 25, buttonColor: '#3498db', buttonTitle: 'Transit', icon: 'bus'        },
  'health'  : { enabled: true, visible: false, size: 25, buttonColor: '#ff6b6b', buttonTitle: 'Medical', icon: 'ambulance'  },
}

let skipIsochrons = false // set to true to disable loading isochrons [for debug]

class TravContainer extends React.Component {
  constructor (props: Object) {
    super(props)
    const durations = this.getIsochronDurations(props.duration)
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
      dateTime: DATETIME,
      durations: durations,
      downSamplingCoordinates: DOWNSAMPLING_COORDINATES,
      fromTo: FROM_TO_MODE,
      networkActivityIndicatorVisible: false,
      spinnerVisible: true,
      placesInfo: placesInfo,
      searchBarVisible: false,
      centerButtonVisible: false,
      centerButtonMask: true,
      uiElementsVisible: false,
    }
  }

  componentDidMount() {
    setUpdateIsochronsStateFn(this.updatePolygonsState.bind(this))
    // load isochrones, animate to region,  isochrones reload, update date to now
    this.updateLocationIsochrons(true, undefined, true, true)
  }

  componentDidUpdate() {
    const { duration } = this.props
    if (savedDuration && duration !== savedDuration) {
      savedDuration = duration
      // reload isochrones when duration changes, no animate to region, no position change, isochrones reload, update date to now
      this.updateLocationIsochrons(false, 'current', true, true)
    }
  }

  componentWillUnmount () {
    setUpdateIsochronsStateFn(null)
    terminateIsochronWorker()
  }

  updateLocationIsochrons (animateToRegion, newPosition, isochronsUpdate, dateUpdate) {
    let dateTime = this.state.dateTime
    if (dateUpdate) {
      dateTime = roundDateTime('now')
      this.setState({ dateTime })
    }
    if (newPosition === 'current') {
      const { locations } = this.state
      newPosition = { coords: { latitude: locations[0].latitude, longitude: locations[0].longitude } }
    }

    return new Promise((resolve, reject) => {
      newPosition ? resolve(newPosition) : navigator.geolocation.getCurrentPosition(position => resolve(position))
    })
    .then(position => {
      // update global var
      currentPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      if (debug) console.tron.display({ name: 'current position', value: currentPosition })

      const locations = [ {
        title: 'Center Location',
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
      } ]
      const newRegion = {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }
      const { duration } = this.props
      const durations = this.getIsochronDurations(duration)
      savedDuration = duration
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
        const { transportMode, travelTimeName } = this.props
        const isochronProvider = transportModeInfo[transportMode].provider
        const params = {
          provider: isochronProvider,
          latitude: roundCoordinate(locations[0].latitude),
          longitude: roundCoordinate(locations[0].longitude),
          durations: durations,
          dateTime: dateTime,
          downSamplingCoordinates: this.state.downSamplingCoordinates[isochronProvider],
          fromTo: travelTimeName,
          transportMode: transportMode,
          trafficMode: TRAFFIC_MODE,
          skip: skipIsochrons,
        }
        this.updatePolygons({ isochrons: params })
        this.polygonsFillColorUpdate()
      }
    },
    error => console.error(error),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
  )}

  getIsochronDurations(duration) {
    //return [ 0, 600, 1200, 1800 ]
    duration = duration || this.props.duration
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

  updatePolygons (params) {
    this.setState({ networkActivityIndicatorVisible: true, spinnerVisible: true })
    updateIsochrons({ params: params.isochrons })
  }

  updatePlaces () {
    if (!savedPolygonsFeature) { return } // do not update places if we don't have a new set of polygons
    const { placesInfo } = this.state
    Promise.all(
      Object.keys(placesInfo).map(type => {
        if (!placesInfo[type].enabled) {
          return new Promise((resolve, reject) => resolve(`getPlaces ${type} disabled`))
        } else {
          const { transportMode } = this.props
          const locations = this.state.locations
          const position = { coords: { latitude: roundCoordinate(locations[0].latitude), longitude: roundCoordinate(locations[0].longitude) } }
          const params = {
            type,
            position,
            mode: transportMode,
            radius: transportModeInfo[transportMode].radius,
            date: roundDateTime(this.state.dateTime),
            size: placesInfo[type].size,
          }
          return getPlaces(params)
          .then(() => placesInPolygonsUpdate(type))
          .catch(err => console.error(err)) // we should never get here
        }
      })
    )
    .then(messages => {
      doneWithSavedPolygonsFeature()
      messages.map(message => { message.match(/error/i) && console.tron.error(message) })
    })
    .catch(err => { doneWithSavedPolygonsFeature(); console.error(err) }) // we should never get here
  }

  updatePolygonsState (state) {
    this.setState({ polygonsState: state })
    this.setState({ networkActivityIndicatorVisible: (state === ISOCHRON_LOADING) ? true : false })
    if (state === ISOCHRON_ERROR) {
      this.setState({ spinnerVisible: false })
      alert('Could not generate isochrons for this location.')
    } else if (state === ISOCHRON_LOADED) {
      this.updatePlaces() // update places
      // delay the removal of the spinner overlay to give time for the isochrons to appear
      const context = this
      setTimeout(() => { context.setState({ spinnerVisible: false }) }, 150)
    } else {
      this.setState({ spinnerVisible: true })
    }
  }

  calloutPress (location) {
    if (debug) console.tron.display({ name: 'calloutPress location', value: location })
    console.log('PRESSED')
  }

  searchTogglePressed () {
    console.tron.log('Pressed!');

    return (
      <SearchBar
        placeholder='Search'
        textFieldBackgroundColor='blue'
      />
    )
  }

  renderMapMarkers (place, index, type) {
    let location = {}
    let pinColor = 'rgba(21, 107, 254, 0.9)'
    if (!type) {
      location = place
    } else {
      location.title = `${place.name} - ${place.time}`
      location.latitude = place.location.lat
      location.longitude = place.location.lng
      if (place.polygonIndex === undefined) {
        return undefined
      }
      if (this.state.polygonsFillColor.indexOf(2) !== -1) {
        if (place.polygonIndex !== undefined && this.state.polygonsFillColor[place.polygonIndex] !== 2) { return undefined }
      }
      let a = 0.9
      // FIXME: put colors in a table
      pinColor = type === 'bank'    ? `rgba(160, 57, 175, ${a})` :
                 type === 'transit' ? `rgba(6, 142, 219, ${a})`  :
                 type === 'health'  ? `rgba(255, 71, 87, ${a})`  : `rgba(100, 100, 100, ${a})`
    }

    return (
      <MapView.Marker
        pinColor={pinColor}
        draggable={ type || index !== 0 ? false : true} // Not friendly with MapView long-press refresh
        key={`${location.title} ${index}`}
        coordinate={{ latitude: location.latitude, longitude: location.longitude }}
        onDragEnd={ type || index !== 0 ? undefined : e => {
          let newRegion = this.state.region
          newRegion.latitude = e.nativeEvent.coordinate.latitude
          newRegion.longitude = e.nativeEvent.coordinate.longitude
          this.refs.map.animateToRegion(newRegion, 500)
        }}
      >
        <MapCallout location={location} onPress={this.calloutPress}/>
      </MapView.Marker>
    )
  }

  onRegionChangeComplete (region) {
    const { mapBrand } = this.props
    if (savedMapBrand && savedMapBrand !== mapBrand) {
      this.refs.map && this.refs.map.animateToRegion(this.state.region, 0)
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

  polygonsFillColorUpdate (index) {
    let polygonsFillColor = this.state.polygonsFillColor

    if (index === undefined) {
      // reset all colors
      polygonsFillColor = [...Array(this.state.durations.length - 1)].map(() => 1)
    } else {
      if (index === 0) {
        // if any color is highlighted, disable all, otherwise enable all
        const v = (polygonsFillColor.indexOf(2) !== -1) ? 1 : 2
        polygonsFillColor = [...Array(this.state.durations.length - 1)].map(() => v)
      } else {
        // switch the corresponding isochron
        polygonsFillColor[index - 1] = (polygonsFillColor[index - 1] === 1) ? 2 : 1
      }
    }

    //if (debug) console.tron.display({ name: 'polygonsFillColor', value: polygonsFillColor })
    this.setState({ polygonsFillColor: polygonsFillColor })
  }

  changePlacesInfo (type) {
    let { placesInfo } = this.state
    placesInfo[type].visible = placesInfo[type].visible ? false : true
    this.setState({ placesInfo })
  }

  onMapLongPress ({ coordinate }) {
    if (debug) console.tron.display({ name: 'onMapLongPress', value: coordinate })
    let newPosition = { coords: coordinate }
    // animate to region, position update, isochrones reload, update date to now
    this.updateLocationIsochrons(true, newPosition, true, true)
    VibrationIOS.vibrate()
  }

  render () {
    //console.log('render')
    const { traffic, mapBrand, mapStyle, mapTile, mapTileName, mapTileUrl, travelTimeName,
            transportIcon, setTransportMode, transportMode } = this.props
    // wait for all polygons to be loaded
    const polygonsCount = (!savedPolygons || this.state.polygonsState !== ISOCHRON_LOADED) ? 0 : savedPolygons.length
    const { placesInfo } = this.state

    return (
      <View style={styles.container}>
        <StatusBar networkActivityIndicatorVisible={this.state.networkActivityIndicatorVisible} />
        <MapView
          ref='map'
          provider={mapBrand === 'Google Maps' ? MapView.PROVIDER_GOOGLE : MapView.PROVIDER_DEFAULT}
          showsTraffic={ traffic }
          style={ styles.map }
          initialRegion={ this.state.region }
          onRegionChangeComplete={ this.onRegionChangeComplete.bind(this) }
          onPress={ () => this.setState({ uiElementsVisible: !this.state.uiElementsVisible }) }
          onLongPress={ e => this.onMapLongPress.call(this, e.nativeEvent) }
          showsUserLocation={this.state.showUserLocation}
          showsCompass={true}
          showsScale={true}
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

          {/* Places Markers */}
          { Object.keys(placesInfo).map(type => {
              return (!placesInfo[type].visible || !savedPlaces[type] || savedPlaces[type].length === 0) ?
                undefined :
                savedPlaces[type].map((place, index) => this.renderMapMarkers.call(this, place, index, type))
            })
          }

          {/* Isochrones */}
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

          {/* Isochrone Center Marker */}
          { this.state.locations.map((location, index) => this.renderMapMarkers.call(this, location, index)) }
        </MapView>

        { this.state.sliderVisible && (
            <Slider
              minimumValue={ 0 }
              maximumValue={ Math.max(1, this.state.durations.length - 1) }
              step={ 1 }
              style={{ position: 'absolute', right: 200, left: -125, top: 250, bottom: 100, height: 50, transform: [{ rotate: '270deg' }] }}
              value={ this.state.sliderValue }
              onValueChange={this.sliderValueChange.bind(this)}
            />
          )
        }

        {/* Search Menu */}
        { !this.state.uiElementsVisible && (
            <ActionButton
              key='search'
              buttonColor='#E74C3C'
              degrees={ 0 }
              icon={<Icon name='search' style={styles.actionButton}></Icon>}
              spacing={ 10 }
              outRangeScale={ 1.2 }
            >
              { Object.keys(placesInfo).concat([ 'refresh' ]).map(type => {
                  if (type === 'refresh') {
                    // animate to region, no position change, isochrones reload, update date to now
                    return (
                      <ActionButton.Item
                        key='search-refresh'
                        buttonColor='#1abc9c'
                        title={ `Refresh Map (${this.state.dateTime})` }
                        onPress={ () => this.updateLocationIsochrons(true, 'current', true, true) }
                      >
                        <Icon name='refresh' style={styles.actionButtonIcon}/>
                      </ActionButton.Item>
                    )
                  } else {
                    return (
                      <ActionButton.Item
                        key={`search-${type}`}
                        buttonColor={ placesInfo[type].buttonColor }
                        title={ placesInfo[type].buttonTitle }
                        onPress={ () => this.changePlacesInfo.call(this, type) }
                      >
                        <Icon name={ placesInfo[type].icon } style={styles.actionButtonIcon}/>
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
              buttonColor='rgba(0,101,85,1)'
              degrees={ 0 }
              icon={<Icon name='clock-o' style={styles.actionButton}></Icon>}
              spacing={ 10 }
              outRangeScale={ 1.2 }
              position='center'
              verticalOrientation='down'
              key='duration'
            >
              { this.state.durations.map((duration, index) => {
                  let buttonEnabled = index === 0 ? false : (this.state.polygonsFillColor[index - 1] === 1 ? false : true)
                  return (
                    <ActionButton.Item
                      size={ 44 + (buttonEnabled ? StyleSheet.hairlineWidth * 4 : 0) }
                      buttonColor={ index === 0 ? '#006631' : isochronFillColor(index / this.state.durations.length, null, true) }
                      btnOutRange='#004B24'
                      onPress={() => this.polygonsFillColorUpdate.call(this, index)}
                      key={ `duration-${index}` }
                      style={ buttonEnabled ? { borderWidth: StyleSheet.hairlineWidth * 4, borderColor: '#fff' } : undefined }
                    >
                      <Text style={styles.durationButtonText}>
                        { (index === 0) ? (this.state.polygonsFillColor.indexOf(2) !== -1 ? 'all\noff' : 'all\non') : (duration / 60).toString() + '\nmin' }
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
              key='settings'
              buttonColor='#58cbf4'
              icon={<Icon name='cog' style={styles.actionButton}></Icon>}
              spacing={ 10 }
              degrees={ 0 }
              position='left'
              verticalOrientation='down'
              onPress={ NavigationActions.settings }
            >
            </ActionButton>
          )
        }

        {/* Transport Mode Button */}
        { !this.state.uiElementsVisible && (
            <ActionButton
              key='transport-mode'
              buttonColor='#2D62A0'
              btnOutRange='#214875'
              icon={<Ionicons name={ transportIcon } style={ styles.actionButton } />}
              spacing={ 10 }
              degrees={ 0 }
              position='right'
              verticalOrientation='down'
              autoInactive={ true }
              outRangeScale={ 1.2 }
            >
              { Object.keys(transportModeInfo).map(transportMode =>
                  <ActionButton.Item
                    key={`transport-mode-${transportMode}`}
                    buttonColor='#2D62A0'
                    size={ 44 }
                    onPress={ () => {
                      setTransportMode(transportMode)
                      /* no animate to region, no position change, isochrones reload, update date to now */
                      this.updateLocationIsochrons(false, 'current', true, true)
                    } }
                  >
                    <Ionicons name={ transportModeInfo[transportMode].icon } style={styles.actionModeButton}/>
                  </ActionButton.Item>
                )
              }
            </ActionButton>
          )
        }

        {/* Center Map Button */}
        { this.state.centerButtonVisible && (
            <ActionButton
              key='center-map'
              buttonColor='#58cbf4'
              icon={<Icon name='crosshairs' style={styles.actionButton}></Icon>}
              spacing={ 10 }
              position='center'
              offsetY={ 45 }
              size={ 35 }
              verticalOrientation='up'
              onPress={ () => { // center map on GPS location
                this.updateLocationIsochrons(true, 'current', false, false)
                this.setState({ centerButtonVisible: false, centerButtonMask: true })
              } }
              onLongPress={ () => { // center map on isochrone center
                // Get current isochron center location
                this.updateLocationIsochrons(true, 'current', false, false)
                this.setState({ centerButtonVisible: false, centerButtonMask: true })
              } }
            >
            </ActionButton>
          )
        }

        {/* Search Bar */}

        {/* <GooglePlacesAutocomplete
        placeholder='Search'
        enablePoweredByContainer={ false }
        minLength={ 2 } // minimum length of text to search
        autoFocus={ false }
        listViewDisplayed='auto'    // true/false/undefined
        fetchDetails={ true }
        // renderDescription={ (row) => row.terms[0].value } // display street only
        onPress={ (data, details = null) => { // 'details' is provided when fetchDetails = true
          console.tron.log(data);
          console.tron.log(details);
        } }
        getDefaultValue={ () => {
          return ''; // text input default value
        } }
        query={ {
          // available options: https://developers.google.com/places/web-service/autocomplete
          key: 'AIzaSyDZaeZPN4R3f82-Gxg7SE6BLxYcmHjvdGM',
          language: 'en', // language of the results
          types: '(cities)', // default: 'geocode'
        } }
        styles={ {
          description: {
            fontWeight: 'bold',
          },
          predefinedPlacesDescription: {
            color: '#1faadb',
          },
        } }

        currentLocation={true} // Will add a 'Current location' button at the top of the predefined places list
        currentLocationLabel="Current location"
        nearbyPlacesAPI='GooglePlacesSearch' // Which API to use: GoogleReverseGeocoding or GooglePlacesSearch
        GoogleReverseGeocodingQuery={{
          // available options for GoogleReverseGeocoding API : https://developers.google.com/maps/documentation/geocoding/intro
        }}
        GooglePlacesSearchQuery={{
          // available options for GooglePlacesSearch API : https://developers.google.com/places/web-service/search
          rankby: 'distance',
          types: 'food',
        }}
        filterReverseGeocodingByTypes={['locality', 'administrative_area_level_3']} // filter the reverse geocoding results by types - ['locality', 'administrative_area_level_3'] if you want to display only cities
        predefinedPlaces={[homePlace, workPlace]}
      /> */}

        {/* Spinner */}
        { this.state.spinnerVisible && (
            <View style={styles.spinnerContainer} key={2}>
              <Spinner style={styles.spinner} size={75} type={'Circle'} color={'#ffffff'} />
              <Text style={styles.spinnerText}>Refreshing Map</Text>
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
  mapTileUrl: PropTypes.string,
  duration: PropTypes.number,
  transportMode: PropTypes.string,
  transportIcon: PropTypes.string,
  setTransportMode: PropTypes.func,
  travelTimeName: PropTypes.string,
}

const mapStateToProps = state => {
  return {
    traffic: state.map.traffic,
    mapBrand: state.map.mapBrand,
    mapStyle: state.map.mapStyle,
    mapTile: state.map.mapTile,
    mapTileName: state.map.mapTileName,
    mapTileUrl: state.map.mapTileUrl,
    duration: state.map.duration,
    transportMode: state.map.transportMode,
    transportIcon: state.map.transportIcon,
    travelTimeName: state.map.travelTimeName,
  }
}

const mapDispatchToProps = dispatch => { return {
  setTransportMode: transportModeName => dispatch(MapActions.setTransportMode(transportModeName))
} }

export default connect(mapStateToProps, mapDispatchToProps)(TravContainer)
