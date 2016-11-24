// @flow

import React, { PropTypes } from 'react'
import { View, ScrollView, Switch, Picker, Text, TouchableOpacity, Image } from 'react-native'
import { connect } from 'react-redux'
import MapActions from '../Redux/MapRedux'
import { Actions as NavigationActions } from 'react-native-router-flux'
import { Colors, Images, Metrics } from '../Themes'
import { CheckBox, Card, Button, List, ListItem, ButtonGroup } from 'react-native-elements'
import CustomActionSheet from 'react-native-custom-action-sheet'
import SettingsList from 'react-native-settings-list';

// external libs
// import PushNotification from 'react-native-push-notification'
import Icon from 'react-native-vector-icons/FontAwesome'
import * as Animatable from 'react-native-animatable'
import I18n from 'react-native-i18n'

// Styles
import styles from './Styles/SettingsScreenStyle'

class SettingsScreen extends React.Component {

  render () {
    const { mapBrand, mapStyle, traffic, toggleTraffic, duration, unitOfMeasurement } = this.props

    return (
      <View style={styles.mainContainer}>
        <Image source={Images.bg} style={styles.backgroundImage} resizeMode='stretch' />
        <ScrollView style={styles.container}>

          <View style={{flex:1}}>
            <View style={{flex:1}}>
              <SettingsList borderColor='#c8c7cc' defaultItemSize={50}>
        	      <SettingsList.Header headerText='Map' headerStyle={{color:'white'}}/>
                <SettingsList.Item
                  itemWidth={50}
                  title='Map type'
                  titleInfo={mapBrand}
                  onPress={() => NavigationActions.mapSelect()}
                />
                <SettingsList.Item title='Map style' titleInfo={mapStyle} onPress={() => NavigationActions.mapStyle()} />
                <SettingsList.Item title='Unit of measurement' titleInfo={unitOfMeasurement} onPress={() => NavigationActions.measurement()} />
                <SettingsList.Item
                  hasNavArrow={false}
                  switchState={traffic}
                  switchOnValueChange={toggleTraffic}
                  hasSwitch={true}
                  title='Traffic'
                />
                <SettingsList.Header headerText='Isochrones' headerStyle={{color:'white', marginTop:50}}/>
                <SettingsList.Item title='Max duration' titleInfo={duration.toString() + 'min'} onPress={() => NavigationActions.maxDuration()} />
                <SettingsList.Item
                  title='Clear isochrone cache'
                  hasNavArrow={false}
                  titleStyle={{color: 'blue'}}
                  onPress={() => console.tron.log(this.props)}
                />
                <SettingsList.Header headerStyle={{color:'white', marginTop:50}}/>
                <SettingsList.Item title='About' onPress={() => NavigationActions.deviceInfo()} />
              </SettingsList>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }
}

SettingsScreen.propTypes = {
  mapBrand: PropTypes.string,
  duration: PropTypes.number,
  traffic: PropTypes.bool,
  unitOfMeasurement: PropTypes.string,
  mapStyle: PropTypes.string,
  toggleTraffic: PropTypes.func,
}

const mapStateToProps = state => {
  return {
    mapBrand: state.map.mapBrand,
    duration: state.map.duration,
    traffic: state.map.traffic,
    unitOfMeasurement: state.map.unitOfMeasurement,
    mapStyle: state.map.mapStyle,
    mapTileName: state.map.mapTileName
  }
}

const mapDispatchToProps = dispatch => {
  return {
    toggleTraffic: () => dispatch(MapActions.toggleTraffic())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SettingsScreen)
