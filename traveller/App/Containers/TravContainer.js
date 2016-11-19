import React from 'react'
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
         isochronFillColor, ISOCHRON_NOT_LOADED, ISOCHRON_LOADING, ISOCHRON_LOADED } from './isochron'

const COORDINATE_PRECISION = 0.001 // degrees
const DATETIME_PRECISION = 60 // seconds
const roundCoordinate = coord => {
  return ( Math.round( Math.abs(coord) / COORDINATE_PRECISION ) * COORDINATE_PRECISION ) * Math.sign(coord)
}
const roundDateTime = dateTime => {
  let date = new Date(dateTime)
  // getTime() gives us milliseconds
  date.setTime( Math.round( date.getTime() / (DATETIME_PRECISION * 1000) ) * (1000 * DATETIME_PRECISION) )
  return date.toISOString()
}
const DATETIME = roundDateTime('2016-11-09T18:49:27.000Z')
const DURATIONS = [ 0, 600, 1200, 1800, 2400, 3000, 3600, 4200 ]
const LATITUDE = roundCoordinate(37.7825177)
const LONGITUDE = roundCoordinate(-122.4106772)
const LATITUDE_DELTA = roundCoordinate(0.1)
const DOWNSAMPLING_COORDINATES = 5 // keep 1 point out of every 5

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const mapProvider = MapView.PROVIDER_GOOGLE

let skipIsochrons = false // set to true to disable loading isochrons [for debug]

const updateLocationIsochrons = context => {
  // get current location
  navigator.geolocation.getCurrentPosition(position => {
    let locations = [ {
      title: 'Starting Location',
      latitude: roundCoordinate(position.coords.latitude),
      longitude: roundCoordinate(position.coords.longitude),
    } ]

    let params = {
      latitude: locations[0].latitude,
      longitude: locations[0].longitude,
      durations: context ? context.state.isochronDurations : DURATIONS,
      dateTime: context ? roundDateTime(context.state.dateTime) : DATETIME,
      downSamplingCoordinates: context ? context.state.downSamplingCoordinates : DOWNSAMPLING_COORDINATES,
      skip: skipIsochrons
    }

    if (!context) {
      updateIsochrons({ params: params })
    } else {
      let initialPosition = JSON.stringify(position)
      context.setState({ initialPosition })
      context.setState({ locations })
      context.setState({ networkActivityIndicatorVisible: true, spinnerVisible: true })
      context.updatePolygons({ isochrons: params })
    }
  },
  error => console.tron.error(error),
  { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
)}

// start loading isochron as soon as we have the current location
updateLocationIsochrons()

class TravContainer extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      initialPosition: 'unknown',
      lastPosition: 'unknown',
      region: {
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      locations: [],
      showUserLocation: false,
      isochronDurations: DURATIONS,
      polygonsState: ISOCHRON_NOT_LOADED,
      polygonsFillColor: [...Array(DURATIONS.length - 1)].map(() => 1),
      dateTime: DATETIME,
      downSamplingCoordinates: DOWNSAMPLING_COORDINATES,
      networkActivityIndicatorVisible: false,
      spinnerVisible: true,
      sliderVisible: false,
      sliderValue: 0,
    }
  }

  componentDidMount() {
    setUpdateIsochronsStateFn(this.updatePolygonsState.bind(this))
    updateLocationIsochrons(this)
  }

  componentWillUnmount () {
    setUpdateIsochronsStateFn(null)
    terminateIsochronWorker()
  }

  updatePolygons (params) {
    updateIsochrons({ params: params.isochrons })
  }

  updatePolygonsState (state) {
    this.setState({ polygonsState: state })
    this.setState({ networkActivityIndicatorVisible: (state === ISOCHRON_LOADED) ? false : true })
    let context = this
    if (state === ISOCHRON_LOADED) {
      // delay the removal of the spinner overlay to give time for the isochrons to appear
      setTimeout(() => { context.setState({ spinnerVisible: false }) }, 150)
    } else {
      this.setState({ spinnerVisible: true })
    }
  }

  calloutPress (location) {
    console.tron.display({ name: 'calloutPress location', value: location })
  }

  renderMapMarkers (location) {
    return (
      <MapView.Marker pinColor='#183446' draggable key={location.title} coordinate={{latitude: location.latitude, longitude: location.longitude}}>
        <MapCallout location={location} onPress={this.calloutPress} />
      </MapView.Marker>
    )
  }

  onRegionChange (region) {
    // Update region when map is dragged
    this.setState({ region });
  }

  sliderValueChange (value) {
    let polygonsFillColor = [...Array(this.state.isochronDurations.length - 1)].map(() => 1)
    if (value > 0) {
      polygonsFillColor[value - 1] = 2
    }
    //console.tron.display({ name: 'polygonsFillColor', value: polygonsFillColor })
    this.setState({ polygonsFillColor: polygonsFillColor, sliderValue: value })
  }

  render () {
    // wait for all polygons to be loaded
    const polygonsCount = (savedPolygons && this.state.polygonsState === ISOCHRON_LOADED) ? savedPolygons.length : 0

    return (
      <View style={styles.container}>
        <StatusBar networkActivityIndicatorVisible={this.state.networkActivityIndicatorVisible} />
        <MapView
          ref='map'
          provider={mapProvider}
          style={styles.map}
          initialRegion={this.state.region}
          onRegionChangeComplete={this.onRegionChange.bind(this)}
          showsUserLocation={this.state.showUserLocation}
        >
          { this.state.locations.map(location => this.renderMapMarkers.call(this, location)) }
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

        <ActionButton buttonColor="rgba(231,76,60,1)"
          degrees={90}
          icon={<Icon name='search'
          style={styles.actionButton}></Icon>}
          spacing={10}
        >
        <ActionButton.Item buttonColor='#9b59b6' title="Banks" onPress={() => console.tron.log("New Task tapped!")}>
          <Icon name="university" style={styles.actionButtonIcon}/>
        </ActionButton.Item>
        <ActionButton.Item buttonColor='#3498db' title="Transit" onPress={() => console.tron.log("Notifications Tapped!")}>
          <Icon name="bus" style={styles.actionButtonIcon} />
        </ActionButton.Item>
        <ActionButton.Item buttonColor='#ff6b6b' title="Medical" onPress={() => console.tron.log('All Tasks Tapped!')}>
          <Icon name="ambulance" style={styles.actionButtonIcon}/>
        </ActionButton.Item>
        <ActionButton.Item buttonColor='#1abc9c' title="Slider" onPress={() => {this.setState({sliderVisible: !this.state.sliderVisible})}}>
          <Icon name="info-circle" style={styles.actionButtonIcon}/>
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

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(TravContainer)
