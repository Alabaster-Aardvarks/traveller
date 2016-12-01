// @flow

import React from 'react'
import { ScrollView, Text, Image, View } from 'react-native'
import { Images } from '../Themes'
import RoundedButton from '../Components/RoundedButton'
import { Actions as NavigationActions } from 'react-native-router-flux'

// Styles
import styles from './Styles/PresentationScreenStyle'

export default class PresentationScreen extends React.Component {
  render () {
    return (
      <View style={styles.mainContainer}>
        <Image source={Images.bg} style={styles.backgroundImage} resizeMode='stretch' />
        <ScrollView style={styles.container}>
          <View style={styles.centered}>
            <Image source={Images.clearLogo} style={styles.logo} />
          </View>

          <View style={styles.section} >
            <Text style={styles.sectionText} >
              Travel. Wisely.
            </Text>
          </View>

          <RoundedButton onPress={NavigationActions.travContainer}>
            Load Traveller
          </RoundedButton>

          <RoundedButton onPress={NavigationActions.deviceInfo}>
            Device Info Screen
          </RoundedButton>

          <View style={styles.centered}>
            <Text style={styles.subtitle}>Made with ❤️ by Alabaster Aardvark</Text>
          </View>

        </ScrollView>
      </View>
    )
  }
}
