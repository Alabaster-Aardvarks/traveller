import React, { Component } from 'react'
import { ScrollView, Image, BackAndroid } from 'react-native'
import styles from './Styles/DrawerContentStyle'
import { Images } from '../Themes'
import DrawerButton from '../Components/DrawerButton'
import { Actions as NavigationActions } from 'react-native-router-flux'

class DrawerContent extends Component {

  componentDidMount () {
    BackAndroid.addEventListener('hardwareBackPress', () => {
      if (this.context.drawer.props.open) {
        this.toggleDrawer()
        return true
      }
      return false
    })
  }

  toggleDrawer = () => {
    this.context.drawer.toggle()
  }

  handlePressTraveller = () => {
    this.toggleDrawer()
    NavigationActions.travContainer()
  }

  handlePressDevice = () => {
    this.toggleDrawer()
    NavigationActions.deviceInfo()
  }

  handlePressSettings = () => {
    this.toggleDrawer()
    NavigationActions.settings()
  }

  render () {
    return (
      <ScrollView style={styles.container}>
        <Image source={Images.plane} style={styles.logo} />
        <DrawerButton text='Map' onPress={this.handlePressTraveller} />
        <DrawerButton text='Settings' onPress={this.handlePressSettings} />
        <DrawerButton text='About' onPress={this.handlePressDevice} />
      </ScrollView>
    )
  }

}

DrawerContent.contextTypes = {
  drawer: React.PropTypes.object
}

export default DrawerContent
