// @flow

import React, { PropTypes } from 'react'
import { View, ScrollView, Switch, Picker, Text, TouchableOpacity, Image } from 'react-native'
import { connect } from 'react-redux'
import LoginActions, { isLoggedIn } from '../Redux/LoginRedux'
import TemperatureActions from '../Redux/TemperatureRedux'
import MapActions from '../Redux/MapRedux'
import { Actions as NavigationActions } from 'react-native-router-flux'
import { Colors, Images, Metrics } from '../Themes'
import RoundedButton from '../Components/RoundedButton'
import FullButton from '../Components/FullButton'
import MapButtonGroup from '../Components/MapButtonGroup'
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
    const { mapBrand, traffic, toggleTraffic, duration } = this.props

    return (
      <View style={styles.mainContainer}>
        <Image source={Images.background} style={styles.backgroundImage} resizeMode='stretch' />
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
                <SettingsList.Item title='Map style' titleInfo='Normal' onPress={() => NavigationActions.deviceInfo()} />
                <SettingsList.Item title='Unit of measurement' titleInfo='Miles'/>
                <SettingsList.Item
                  hasNavArrow={false}
                  switchState={traffic}
                  switchOnValueChange={toggleTraffic}
                  hasSwitch={true}
                  title='Traffic'
                />
                <SettingsList.Header headerText='isochrons' headerStyle={{color:'white', marginTop:50}}/>
                <SettingsList.Item title='Max duration' titleInfo={duration.toString() + 'min'} onPress={() => NavigationActions.maxDuration()} />
                <SettingsList.Item
                  title='Clear isochron cache'
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
  mileType: PropTypes.string,
  mapType: PropTypes.string,
  toggleTraffic: PropTypes.func,
}

const mapStateToProps = state => {
  return {
    mapBrand: state.map.mapBrand,
    duration: state.map.duration,
    traffic: state.map.traffic,
    mileType: state.map.mileType,
    mapType: state.map.mapType,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    toggleTraffic: () => dispatch(MapActions.toggleTraffic())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SettingsScreen)
