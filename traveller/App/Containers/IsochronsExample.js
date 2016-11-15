import React from 'react'
import { connect } from 'react-redux'
import { View, StyleSheet, Text, Dimensions } from 'react-native'
import MapView from 'react-native-maps'
import { calculateRegion } from '../Lib/MapHelpers'
import MapCallout from '../Components/MapCallout'
import Styles from './Styles/MapviewExampleStyle'
import { updateIsochrons, setUpdateIsochronsFn, setUpdateIsochronsStateFn,
         fillColor, NOT_LOADED, LOADING, LOADED } from './isochron'

/* ***********************************************************
* IMPORTANT!!! Before you get started, if you are going to support Android,
* PLEASE generate your own API key and add it to android/app/src/main/AndroidManifest.xml
* We've included our API key for demonstration purposes only, and it will be regenerated from
* time to time. As such, neglecting to complete this step could potentially break your app in production!
* https://console.developers.google.com/apis/credentials
* Also, you'll need to enable Google Maps Android API for your project:
* https://console.developers.google.com/apis/api/maps_android_backend/
*************************************************************/

// Daniel - default values
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE = 37.7825177;
const LONGITUDE = -122.4106772;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const DATETIME = '20161109T184927';
const DURATIONS = [ 0, 600, 1200, 1800, 2400, 3000, 3600, 4200 ];
const mapProvider = MapView.PROVIDER_GOOGLE;

// start loading isochrons on load
updateIsochrons({ params: {
  latitude: LATITUDE,
  longitude: LONGITUDE,
  durations: DURATIONS,
  dateTime: DATETIME
}})

class MapviewExample extends React.Component {
  /* ***********************************************************
  * This example is only intended to get you started with the basics.
  * There are TONS of options available from traffic to buildings to indoors to compass and more!
  * For full documentation, see https://github.com/lelandrichardson/react-native-maps
  *************************************************************/

  constructor (props) {
    super(props)
    /* ***********************************************************
    * STEP 1
    * Set the array of locations to be displayed on your map. You'll need to define at least
    * a latitude and longitude as well as any additional information you wish to display.
    *************************************************************/
    const locations = [
      { title: 'Location A', latitude: 37.78825, longitude: -122.4324 },
      { title: 'Location B', latitude: 37.75825, longitude: -122.4624 }
    ]
    /* ***********************************************************
    * STEP 2
    * Set your initial region either by dynamically calculating from a list of locations (as below)
    * or as a fixed point, eg: { latitude: 123, longitude: 123, latitudeDelta: 0.1, longitudeDelta: 0.1}
    *************************************************************/
    const region = calculateRegion(locations, { latPadding: 0.05, longPadding: 0.05 })
    this.state = {
      region: { // Daniel - default region state
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA
      },
      locations,
      showUserLocation: true,
      zoom: 11,
      isochronDurations: DURATIONS,
      polygonsState: NOT_LOADED,
      dateTime: DATETIME,
      polygons: []
    }
    this.renderMapMarkers = this.renderMapMarkers.bind(this)
    this.onRegionChange = this.onRegionChange.bind(this)
  }

  componentDidMount () {
    //console.tron.display({ name: 'componentDidMount', value: 'mounted' })
    setUpdateIsochronsFn(this.updatePolygonsData.bind(this))
    setUpdateIsochronsStateFn(this.updatePolygonsState.bind(this))

    // delay to give time for the UI to render the map
    setTimeout(() => this.updatePolygons({
      isochrons: {
        latitude: this.state.region.latitude,
        longitude: this.state.region.longitude,
        durations: this.state.isochronDurations,
        dateTime: this.state.dateTime
      }
    }), 500)
  }
  componentWillUnmount () {
    //console.tron.display({ name: 'componentWillUnmount', value: 'about to unmount' })
    setUpdateIsochronsFn(null)
    setUpdateIsochronsStateFn(null)
  }

  updatePolygons (params) {
    updateIsochrons({ params: params.isochrons })
  }

  updatePolygonsData (polygons) {
    //console.tron.display({ name: 'updatePolygonsData', value: 'polygon update' })
    this.setState({ polygons: polygons });
  }
  updatePolygonsState (state) {
    //console.tron.display({ name: 'updatePolygonsState', value: state })
    this.setState({ polygonsState: state })
  }

  componentWillReceiveProps (newProps) {
    /* ***********************************************************
    * STEP 3
    * If you wish to recenter the map on new locations any time the
    * Redux props change, do something like this:
    *************************************************************/
    // this.setState({
    //   region: calculateRegion(newProps.locations, { latPadding: 0.1, longPadding: 0.1 })
    // })
  }

  onRegionChange (region) {
    /* ***********************************************************
    * STEP 4
    * If you wish to fetch new locations when the user changes the
    * currently visible region, do something like this:
    *************************************************************/
    // const searchRegion = {
    //   ne_lat: newRegion.latitude + newRegion.latitudeDelta,
    //   ne_long: newRegion.longitude + newRegion.longitudeDelta,
    //   sw_lat: newRegion.latitude - newRegion.latitudeDelta,
    //   sw_long: newRegion.longitude - newRegion.longitudeDelta
    // }
    // Fetch new data...
    //

    // Daniel - when map dragged update region state
    this.setState({ region });
  }

  calloutPress (location) {
    /* ***********************************************************
    * STEP 5
    * Configure what will happen (if anything) when the user
    * presses your callout.
    *************************************************************/
    console.tron.log(location)
  }

  renderMapMarkers (location) {
    /* ***********************************************************
    * STEP 6
    * Customize the appearance and location of the map marker.
    * Customize the callout in ../Components/MapCallout.js
    *************************************************************/

    return (
      <MapView.Marker draggable key={location.title} coordinate={{latitude: location.latitude, longitude: location.longitude}}>
        <MapCallout location={location} onPress={this.calloutPress} />
      </MapView.Marker>
    )
  }

  render () {
    // wait for all polygons to be loaded
    const polygonsCount = (this.state.polygons && this.state.polygonsState === LOADED) ? this.state.polygons.length : 0;

    return (
      <View style={Styles.container}>
        <MapView
          ref='map'
          provider={mapProvider}
          style={Styles.map}
          initialRegion={this.state.region}
          onRegionChangeComplete={this.onRegionChange}
          showsUserLocation={this.state.showUserLocation}
        >
          {this.state.locations.map(location => this.renderMapMarkers(location))}
          { polygonsCount === 0 ? undefined : this.state.polygons.map((pArray, arrayIndex) => {
              return (pArray.length === 0) ? undefined : pArray.map((p, index) => {
                return (
                  <MapView.Polygon
                    coordinates={ p.polygon }
                    holes={ p.holes }
                    fillColor={ fillColor(p.index, (p.index === 2) ? 0.5 : 0.2) }
                    strokeWidth={ 1 }
                    strokeColor={ 'rgba(85, 85, 85, 0.8)' }
                    key={ arrayIndex * 1000 + index }
                  />
                )
              })
            })
          }
        </MapView>
        <View style={[styles.bubble, styles.latlng]}>
          <Text style={{ textAlign: 'center' }}>
            {this.state.region.latitude.toPrecision(7)},
            {this.state.region.longitude.toPrecision(7)}
          </Text>
        </View>
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    // ...redux state to props here
  }
}

// Daniel - Styles for the long/lat bubble, etc.
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  latlng: {
    width: 200,
    alignItems: 'stretch',
  },
  button: {
    width: 80,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: 'transparent',
  },
});

export default connect(mapStateToProps)(MapviewExample)
