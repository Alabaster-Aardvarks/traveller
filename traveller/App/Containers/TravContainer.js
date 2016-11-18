// @flow

import React from 'react'
import { connect } from 'react-redux'
import { ScrollView, View, StyleSheet, Text, Dimensions, Slider } from 'react-native'
import { Actions as NavigationActions } from 'react-native-router-flux'
import AlertMessage from '../Components/AlertMessage'
import MapView from 'react-native-maps'
import { calculateRegion } from '../Lib/MapHelpers'
import MapCallout from '../Components/MapCallout'
import ListviewGridExample from './ListviewGridExample'
import ActionButton from 'react-native-action-button';
import Icon from 'react-native-vector-icons/FontAwesome';

// Default values
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE = 37.78825;
const LONGITUDE = -122.4324;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Styles
import styles from './Styles/TravContainerStyle'


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
    }
  }

  componentDidMount() {
    let context = this;
    this.renderMapMarkers = this.renderMapMarkers.bind(this)
    this.onRegionChange = this.onRegionChange.bind(this)
    const getCurrentLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          let initialPosition = JSON.stringify(position);
          context.setState({ initialPosition })
          let locations = [{
            title: 'Starting Location',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }];
          context.setState({ locations });
          const region = calculateRegion(locations, { latPadding: 0.05, longPadding: 0.05 });
        },
        (error) => alert(JSON.stringify(error)),
        {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000}
      )
    }
    getCurrentLocation()

    setTimeout(() => {
      const testRegion = {
        latitude: context.state.locations.latitude,
        longitude: context.state.locations.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }
    console.tron.log(context.state.locations.latitude);
    //   this.refs.map.animateToCoordinate(testRegion, 50) // TODO: Center map on GPS coords
  }, 1000)
  }

  calloutPress (location) {
    console.tron.log(location)
  }

  renderMapMarkers (location) {
    return (
      <MapView.Marker pinColor='#183446' draggable key={location.title} coordinate={{latitude: location.latitude, longitude: location.longitude}}>
        <MapCallout location={location} onPress={this.calloutPress} />
      </MapView.Marker>
    )
  }

  onRegionChange (region) {
    this.setState({ region });
  }

  render () {

    const coordinates = [ { latitude: LATITUDE, longitude: LONGITUDE },
                          { latitude: LATITUDE + 0.015, longitude: LONGITUDE - 0.015 },
                          { latitude: LATITUDE - 0.015, longitude: LONGITUDE - 0.005 },
                        ];

    return (
      <View style={styles.container}>
        <MapView
          ref='map'
          provider={MapView.PROVIDER_GOOGLE}
          // style={styles.map}
          width={width}
          height={height}
          initialRegion={this.state.region}
          onRegionChangeComplete={this.onRegionChange}
          showsUserLocation={this.state.showUserLocation}
          >
            {this.state.locations.map((location) => this.renderMapMarkers(location))}
          </MapView>

          <Slider step={0.25} style={{ position: 'absolute', right: 200, left: -125, top: 250, bottom: 100, height: 50, transform: [{ rotate: '270deg' }] }} />

          <ActionButton buttonColor="rgba(231,76,60,1)"
            degrees={90}
            icon={<Icon name='search'
            style={styles.actionButton}></Icon>}
            spacing={10}
          >
          <ActionButton.Item buttonColor='#9b59b6' title="Banks" onPress={() => console.tron.log("New Task tapped!")}>
            <Icon name="university" style={styles.actionButtonIcon}/>
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#3498db' title="Transit" onPress={() => console.tron.log("Noifications Tapped!")}>
            <Icon name="bus" style={styles.actionButtonIcon} />
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#ff6b6b' title="Medical" onPress={() => console.tron.log('All Tasks Tapped!')}>
            <Icon name="ambulance" style={styles.actionButtonIcon}/>
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#1abc9c' title="Settings" onPress={() => console.tron.log('All Tasks Tapped!')}>
            <Icon name="cog" style={styles.actionButtonIcon}/>
          </ActionButton.Item>
        </ActionButton>
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
