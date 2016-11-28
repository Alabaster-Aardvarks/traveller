import React, { Component } from 'react'
import { Scene, Router } from 'react-native-router-flux'
import Styles from './Styles/NavigationContainerStyle'
import NavigationDrawer from './NavigationDrawer'
import NavItems from './NavItems'
// import CustomNavBar from '../Components/CustomNavBar'

// Screens Identified By The Router
// import PresentationScreen from '../Containers/PresentationScreen'
import LoginScreen from '../Containers/LoginScreen'
import DeviceInfoScreen from '../Containers/DeviceInfoScreen'
import TravContainer from '../Containers/TravContainer'
import SettingsScreen from '../Containers/SettingsScreen'
import MapSelectScreen from '../Containers/MapSelectScreen'
import MapStyleScreen from '../Containers/MapStyleScreen'
import MaxDurationScreen from '../Containers/MaxDurationScreen'
import MeasurementScreen from '../Containers/MeasurementScreen'

// Documentation: https://github.com/aksonov/react-native-router-flux

class NavigationRouter extends Component {
  render () {
    return (
      <Router>
        <Scene key='drawer' component={NavigationDrawer} open={false}>
          <Scene key='drawerChildrenWrapper' navigationBarStyle={Styles.navBar} titleStyle={Styles.title} leftButtonIconStyle={Styles.leftButton} rightButtonTextStyle={Styles.rightButton}>
            {/* <Scene initial key='presentationScreen' component={TravContainer} title='Traveller' renderLeftButton={NavItems.hamburgerButton} /> */}
            <Scene initial key='travContainer' component={TravContainer} hideNavBar />
            <Scene key='deviceInfo' component={DeviceInfoScreen} title='Device Info' />
            <Scene key='settings' component={SettingsScreen} title='Settings' hideNavBar={ false } />
            <Scene key='mapSelect' component={MapSelectScreen} title='Map Type' />
            <Scene key='mapStyle' component={MapStyleScreen} title='Map Style' />
            <Scene key='maxDuration' component={MaxDurationScreen} title='Max Duration' />
            <Scene key='measurement' component={MeasurementScreen} title='Unit of Measurement' />
          </Scene>
        </Scene>
      </Router>
    )
  }
}

export default NavigationRouter
