import React, { Component } from 'react'
import { Scene, Router } from 'react-native-router-flux'
import Styles from './Styles/NavigationContainerStyle'
import Colors from '../Themes/Colors'
import NavigationDrawer from './NavigationDrawer'
import NavItems from './NavItems'

// Screens Identified By The Router
import LoginScreen from '../Containers/LoginScreen'
import DeviceInfoScreen from '../Containers/DeviceInfoScreen'
import TravContainer from '../Containers/TravContainer'
import SettingsScreen from '../Containers/SettingsScreen'
import MapSelectScreen from '../Containers/MapSelectScreen'
import MapStyleScreen from '../Containers/MapStyleScreen'
import MaxDurationScreen from '../Containers/MaxDurationScreen'
import MeasurementScreen from '../Containers/MeasurementScreen'
import TransportModeScreen from '../Containers/TransportModeScreen'

// Documentation: https://github.com/aksonov/react-native-router-flux

class NavigationRouter extends Component {
  render () {
    return (
      <Router>
        <Scene key='drawer' component={NavigationDrawer} open={false}>
          <Scene key='drawerChildrenWrapper' navigationBarStyle={Styles.navBar} titleStyle={Styles.title} leftButtonIconStyle={Styles.leftButton} rightButtonTextStyle={Styles.rightButton}>
            <Scene initial key='travContainer' component={TravContainer} hideNavBar />
            <Scene key='deviceInfo' component={DeviceInfoScreen} title='Device Info' />
            <Scene key='settings' component={SettingsScreen} title='Settings' hideNavBar={ false } direction='vertical' backTitle='Done' hideBackImage={ true } backButtonTextStyle={{color: Colors.whiteLight}} />
            <Scene key='mapSelect' component={MapSelectScreen} title='Map Type' />
            <Scene key='mapStyle' component={MapStyleScreen} title='Map Style' />
            <Scene key='maxDuration' component={MaxDurationScreen} title='Max Duration' />
            <Scene key='measurement' component={MeasurementScreen} title='Unit of Measurement' />
            <Scene key='transportMode' component={TransportModeScreen} title='Transport Mode' />
          </Scene>
        </Scene>
      </Router>
    )
  }
}

export default NavigationRouter
