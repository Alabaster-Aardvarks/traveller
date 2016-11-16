// @flow

import React from 'react'
import { connect } from 'react-redux'
import { ScrollView, View, StyleSheet, Text, Dimensions, Slider } from 'react-native'
// Add Actions - replace 'Your' with whatever your reducer is called :)
// import YourActions from '../Redux/YourRedux'
import { Actions as NavigationActions } from 'react-native-router-flux'
import AlertMessage from '../Components/AlertMessage'
import MapView from 'react-native-maps'
import { calculateRegion } from '../Lib/MapHelpers'
import MapCallout from '../Components/MapCallout'
import ListviewGridExample from './ListviewGridExample'

import ActionButton from 'react-native-action-button';
import Icon from 'react-native-vector-icons/Ionicons';


// Default values
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE = 37.78825;
const LONGITUDE = -122.4324;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Styles
import styles from './Styles/TravContainerStyle'
// import Styles from './Styles/MapviewExampleStyle'


class TravContainer extends React.Component {
  constructor (props) {

    super(props)
    const locations = [ { title: 'Hack Reactor', latitude: 37.783697, longitude: -122.408966 } ];
    const region = calculateRegion(locations, { latPadding: 0.05, longPadding: 0.05 });
    this.state = {
      region: {
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      locations,
      showUserLocation: true,
      zoom: 11
    }
    this.renderMapMarkers = this.renderMapMarkers.bind(this)
    this.onRegionChange = this.onRegionChange.bind(this)
  }

  calloutPress (location) {
    console.tron.log(location)
  }

  renderMapMarkers (location) {
    return (
      <MapView.Marker key={location.title} coordinate={{latitude: location.latitude, longitude: location.longitude}}>
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
                          { latitude: LATITUDE - 0.015, longitude: LONGITUDE - 0.005 } ];

    return (
      <View style={styles.container}>
        <MapView
          provider={MapView.PROVIDER_GOOGLE}
          // style={styles.map}
          width={width}
          height={height * 0.78}
          initialRegion={this.state.region}
          onRegionChangeComplete={this.onRegionChange}
          showsUserLocation={this.state.showUserLocation}
          >
            {this.state.locations.map((location) => this.renderMapMarkers(location))}
          </MapView>

          <ActionButton buttonColor="rgba(231,76,60,1)" degrees={180} icon={<Icon name='ios-compass-outline' style={styles.actionButtonIcon}></Icon>}>
          <ActionButton.Item buttonColor='#9b59b6' title="Banks" onPress={() => console.tron.log("New Task tapped!")}>
            <Icon name="fa-glass" />
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#3498db' title="Transit" onPress={() => console.tron.log("Noifications Tapped!")}>
            <Icon name="md-notifications-off" />
          </ActionButton.Item>
          <ActionButton.Item buttonColor='#1abc9c' title="Medical" onPress={() => console.tron.log('All Tasks Tapped!')}>
            <Icon name="md-done-all" />
          </ActionButton.Item>
        </ActionButton>
        <Slider step={0.27} style={{marginTop: 25}} />
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
