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
import { updateIsochrons, setUpdateIsochronsStateFn, savedPolygons, terminateIsochronWorker, doneWithSavedPolygonsFeature,
         isochronFillColor, ISOCHRON_NOT_LOADED, ISOCHRON_LOADING, ISOCHRON_LOADED, ISOCHRON_ERROR } from './isochron'
import { getPlaces, savedPlaces, placesTypes, convertDayHourMinToSeconds, placesInPolygonsUpdate } from './places'
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

let skipIsochrons = false // set to true to disable loading isochrons [for debug]

const getIsochronProvider = { // [navitia,here,route360,graphhopper]
  'walk'    : 'here',
  'car'     : 'here',
  'bike'    : 'navitia',
  'transit' : 'navitia',
}

// FIXME: remove support for context not defined and move inside component
// FIXME: if newPosition is provided, we should not get the new current location
const updateLocationIsochrons = (context, animateToRegion, newPosition, noUpdate) => {
  // get current location
  navigator.geolocation.getCurrentPosition(position => {
    if (newPosition) { position = newPosition }
    currentPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude }
    if (debug) console.tron.display({ name: 'current position', value: currentPosition })
    const locations = [ {
      title: 'Starting Location',
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
    } ]

    const durations = context ? context.getIsochronDurations(context.props.duration) : DURATIONS

    // Isochrone parameters
    let transportMode = context ? context.props.transportMode : TRANSPORT_MODE
    let isochronProvider = getIsochronProvider[transportMode]
    const params = {
      provider: isochronProvider,
      latitude: roundCoordinate(locations[0].latitude),
      longitude: roundCoordinate(locations[0].longitude),
      durations: durations,
      dateTime: context ? roundDateTime(context.state.dateTime) : DATETIME,
      downSamplingCoordinates: context ? context.state.downSamplingCoordinates[isochronProvider] : DOWNSAMPLING_COORDINATES[isochronProvider],
      fromTo: context ? context.props.travelTimeName : FROM_TO_MODE,
      transportMode: transportMode,
      trafficMode: TRAFFIC_MODE,
      skip: skipIsochrons,
    }

    if (!context) {
      !noUpdate && updateIsochrons({ params: params })
    } else {
      const initialPosition = JSON.stringify(position)
      const newRegion = {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }
      if (!noUpdate) {
        context.setState({ initialPosition })
        context.setState({ locations })
        context.setState({ region: newRegion })
        context.setState({ durations: durations })
        savedMapBrand = context.props.mapBrand
      }
      animateToRegion && context.refs.map.animateToRegion(newRegion, 500)
      if (!noUpdate) {
        context.updatePolygons.call(context, { isochrons: params })
        context.polygonsFillColorUpdate()
      }
    }
  },
  error => console.error(error),
  { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
)}

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
      placesTypes: {},
      searchBarVisible: false,
      centerButtonVisible: false,
      centerButtonMask: true,
      uiElementsVisible: false,
    }
  }

  componentDidMount() {
    //console.log('componentDidMount')
    setUpdateIsochronsStateFn(this.updatePolygonsState.bind(this))
    updateLocationIsochrons(this, true)
  }

  componentDidUpdate() {
    const { duration } = this.props
    if (savedDuration && duration !== savedDuration) {
      savedDuration = duration
      const locations = this.state.locations
      const position = { coords: { latitude: roundCoordinate(locations[0].latitude), longitude: roundCoordinate(locations[0].longitude) } }
      // reload isochron when duration changes, no change of position, no animate to region
      updateLocationIsochrons(this, false, position)
    }
  }

  componentWillUnmount () {
    //console.log('componentWillUnmount')
    setUpdateIsochronsStateFn(null)
    terminateIsochronWorker()
  }

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
    //console.log('getIsochronDurations', durations)
    return durations
  }

  updatePolygons (params) {
    this.setState({ networkActivityIndicatorVisible: true, spinnerVisible: true })
    updateIsochrons({ params: params.isochrons })
  }

  updatePlaces () {
    const { transportMode } = this.props
    const locations = this.state.locations
    const position = { coords: { latitude: roundCoordinate(locations[0].latitude), longitude: roundCoordinate(locations[0].longitude) } }

    Promise.all(
      Object.keys(placesTypes).map(type => {
        if (!placesTypes[type]) {
          return new Promise((resolve, reject) => resolve(`getPlaces ${type} disabled`))
        } else {
          return getPlaces(type, position, transportMode)
          .then(() => placesInPolygonsUpdate(type))
          .catch(err => console.error(err)) // we should never get here
        }
      })
    )
    .then(messages => {
      doneWithSavedPolygonsFeature()
      messages.map(message => {
        message.match(/error/i) && console.tron.error(message)
      })
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

  changePlacesType (type) {
    let placesTypes = this.state.placesTypes
    placesTypes[type] = placesTypes[type] ? false : true
    this.setState({ placesTypes: placesTypes })
  }

  onMapLongPress ({ coordinate }) {
    if (debug) console.tron.display({ name: 'onMapLongPress', value: coordinate })
    let newPosition = { coords: coordinate }
    updateLocationIsochrons(this, true, newPosition)
    VibrationIOS.vibrate()
  }

  render () {
    //console.log('render')
    const { traffic, mapBrand, mapStyle, mapTile, mapTileName, mapTileUrl, travelTimeName,
            transportIcon, setTransportMode, transportMode } = this.props
    // wait for all polygons to be loaded
    const polygonsCount = (!savedPolygons || this.state.polygonsState !== ISOCHRON_LOADED) ? 0 : savedPolygons.length

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
          { Object.keys(this.state.placesTypes).map(type => {
              return (!this.state.placesTypes[type] || !savedPlaces[type] || savedPlaces[type].length === 0) ?
                undefined :
                savedPlaces[type].map((place, index) => this.renderMapMarkers.call(this, place, index, type))
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
        { !this.state.uiElementsVisible && (<ActionButton
          buttonColor='rgba(231,76,60,1)'
          degrees={ 0 }
          icon={<Icon name='search' style={styles.actionButton}></Icon>}
          spacing={ 10 }
          outRangeScale={ 1.2 }
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
        </ActionButton>)
        }

        {/* Duration Button */}
        { !this.state.uiElementsVisible && (<ActionButton
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
                    buttonColor={ index === 0 ? 'rgb(0, 102, 49)' : isochronFillColor(index / this.state.durations.length, null, true) }
                    onPress={() => this.polygonsFillColorUpdate.call(this, index)}
                    key={ `duration${index}` }
                    style={ buttonEnabled ? { borderWidth: StyleSheet.hairlineWidth * 4, borderColor: '#fff' } : undefined }
                  >
                    <Text style={styles.durationButtonText}>
                      { (index === 0) ? (this.state.polygonsFillColor.indexOf(2) !== -1 ? 'all\noff' : 'all\non') : (duration / 60).toString() + '\nmin' }
                    </Text>
                  </ActionButton.Item>
                )
              })
            }
          </ActionButton>)
        }

        {/* Settings Button */}
        { !this.state.uiElementsVisible && (<ActionButton
          buttonColor='#58cbf4'
          icon={<Icon name='cog' style={styles.actionButton}></Icon>}
          spacing={ 10 }
          degrees={ 0 }
          position='left'
          verticalOrientation='down'
          onPress={ NavigationActions.settings }
        >
        </ActionButton>)
        }

        {/* Transport Mode Button */}
        { !this.state.uiElementsVisible && (<ActionButton
          buttonColor='#2D62A0'
          icon={<Ionicons name={ transportIcon } style={ styles.actionModeButton } />}
          spacing={ 10 }
          degrees={ 0 }
          position='right'
          verticalOrientation='down'
          autoInactive={ true }
          outRangeScale={ 1.2 }
        >
          {/* FIXME: rewrite this as a loop */}
          <ActionButton.Item buttonColor='#2D62A0' onPress={() => {
            setTransportMode('walk')
            const locations = this.state.locations
            const position = { coords: { latitude: roundCoordinate(locations[0].latitude), longitude: roundCoordinate(locations[0].longitude) } }
            updateLocationIsochrons(this, true, position)
          }}>
            <Ionicons name='md-walk' style={styles.actionModeButton}/>
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#2D62A0' onPress={() => {
            setTransportMode('bike')
            const locations = this.state.locations
            const position = { coords: { latitude: roundCoordinate(locations[0].latitude), longitude: roundCoordinate(locations[0].longitude) } }
            updateLocationIsochrons(this, true, position)
          }}>
            <Ionicons name='md-bicycle' style={styles.actionModeButton} />
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#2D62A0' onPress={() => {
            setTransportMode('car')
            const locations = this.state.locations
            const position = { coords: { latitude: roundCoordinate(locations[0].latitude), longitude: roundCoordinate(locations[0].longitude) } }
            updateLocationIsochrons(this, true, position)
          }}>
            <Ionicons name='md-car' style={styles.actionModeButton}/>
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#2D62A0' onPress={() => {
            setTransportMode('transit')
            const locations = this.state.locations
            const position = { coords: { latitude: roundCoordinate(locations[0].latitude), longitude: roundCoordinate(locations[0].longitude) } }
            updateLocationIsochrons(this, true, position)
          }}>
            <Ionicons name='md-train' style={styles.actionButtonIcon}/>
          </ActionButton.Item>
        </ActionButton>)
        }

        {/* Center Map Button */}
        { this.state.centerButtonVisible && (<ActionButton
          buttonColor='#58cbf4'
          icon={<Icon name='crosshairs' style={styles.actionButton}></Icon>}
          spacing={ 10 }
          position='center'
          offsetY={ 45 }
          size={ 35 }
          verticalOrientation='up'
          // Center map on GPS
          onPress={ () => {
            updateLocationIsochrons(this, true, undefined, true)
            this.setState({ centerButtonVisible: false, centerButtonMask: true })
          } }
          // Center map on current isochron
          onLongPress={ () => {
            // Get current isochron location
            const locations = this.state.locations
            const position = { coords: { latitude: roundCoordinate(locations[0].latitude), longitude: roundCoordinate(locations[0].longitude) } }
            updateLocationIsochrons(this, true, position, true)
            this.setState({ centerButtonVisible: false, centerButtonMask: true })
          } }
        >
        </ActionButton>) }

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

const mapStateToProps = (state) => {
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

const mapDispatchToProps = (dispatch) => { return {
  setTransportMode: (transportModeName) => dispatch(MapActions.setTransportMode(transportModeName))
} }

export default connect(mapStateToProps, mapDispatchToProps)(TravContainer)
