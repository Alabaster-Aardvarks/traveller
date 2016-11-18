// @flow

import { StyleSheet } from 'react-native'
import { Colors, Metrics, ApplicationStyles } from '../../Themes/'

export default StyleSheet.create({
  // ...ApplicationStyles.screen,
  travContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionButton: {
    fontSize: 20,
    color: 'white',
  },
  actionButtonIcon: {
    fontSize: 17,
    color: 'white',
  },
  // container: {
  //   flex: 1,
  //   // justifyContent: 'flex-end',
  //   // alignItems: 'center',
  //   marginTop: Metrics.navBarHeight,
  //   backgroundColor: Colors.background
  // },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    // For Android :/
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  spinnerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  spinner: {
    opacity: 0.75,
    marginVertical: 40,
  },
  spinnerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
  },
})
