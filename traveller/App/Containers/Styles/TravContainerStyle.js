// @flow

import { StyleSheet } from 'react-native'
import { Colors, Metrics, ApplicationStyles } from '../../Themes/'

export default StyleSheet.create({
  ...ApplicationStyles.screen,
  travContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionButton: {
    fontSize: 30,
    color: 'white',
  },
  actionButtonIcon: {
    fontSize: 15,
    color: 'white',
  },
  container: {
    flex: 1,
    // justifyContent: 'flex-end',
    // alignItems: 'center',
    marginTop: Metrics.navBarHeight,
    backgroundColor: Colors.background
  },
  map: {
    // For Android :/
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }
})
