import React, { Component } from 'react'
import { Scene, Router } from 'react-native-router-flux'
import Styles from './Styles/NavigationContainerStyle'
import NavigationDrawer from './NavigationDrawer'
import NavItems from './NavItems'
import CustomNavBar from '../Components/CustomNavBar'

// Screens Identified By The Router
import PresentationScreen from '../Containers/PresentationScreen'
import LoginScreen from '../Containers/LoginScreen'
import DeviceInfoScreen from '../Containers/DeviceInfoScreen'
<<<<<<< 71de6590e6bea91b1064ca94d0d0758826be735c
import TravContainer from '../Containers/TravContainer'
=======
import SettingsScreen from '../Containers/SettingsScreen'
>>>>>>> Add settings page to hamburger view

// Documentation: https://github.com/aksonov/react-native-router-flux

class NavigationRouter extends Component {
  render () {
    return (
      <Router>
        <Scene key='drawer' component={NavigationDrawer} open={false}>
          <Scene key='drawerChildrenWrapper' navigationBarStyle={Styles.navBar} titleStyle={Styles.title} leftButtonIconStyle={Styles.leftButton} rightButtonTextStyle={Styles.rightButton}>
            <Scene initial key='presentationScreen' component={TravContainer} title='Traveller' renderLeftButton={NavItems.hamburgerButton} />
            <Scene key='travContainer' component={TravContainer} title='Traveller' />
            <Scene key='deviceInfo' component={DeviceInfoScreen} title='Device Info' navBar={CustomNavBar} />
          </Scene>
        </Scene>
      </Router>
    )
  }
}

export default NavigationRouter
