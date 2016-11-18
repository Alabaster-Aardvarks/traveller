// @flow

import React, { Component } from 'react'
import { Scene, Router } from 'react-native-router-flux'
import Styles from './Styles/NavigationContainerStyle'
import NavigationDrawer from './NavigationDrawer'
import NavItems from './NavItems'
import CustomNavBar from '../Components/CustomNavBar'

// screens identified by the router
import PresentationScreen from '../Containers/PresentationScreen'
import LoginScreen from '../Containers/LoginScreen'
import DeviceInfoScreen from '../Containers/DeviceInfoScreen'
import TravContainer from '../Containers/TravContainer'


/* **************************
* Documentation: https://github.com/aksonov/react-native-router-flux
***************************/

class NavigationRouter extends Component {
  render () {
    return (
      <Router>
        <Scene key='drawer' component={NavigationDrawer} open={false}>
          <Scene key='drawerChildrenWrapper' navigationBarStyle={Styles.navBar} titleStyle={Styles.title} leftButtonIconStyle={Styles.leftButton} rightButtonTextStyle={Styles.rightButton}>
            <Scene initial key='presentationScreen' component={TravContainer} title='Traveller' renderLeftButton={NavItems.hamburgerButton} />
          </Scene>
        </Scene>
      </Router>
    )
  }
}

export default NavigationRouter
