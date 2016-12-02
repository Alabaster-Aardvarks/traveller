// @flow

import { StyleSheet, Dimensions } from 'react-native'
import { Colors, Metrics, ApplicationStyles } from '../../Themes/'

const { width, height } = Dimensions.get('window');

export default StyleSheet.create({
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
  actionModeButton: {
    fontSize: 25,
    color: 'white',
  },
  durationButtonText: {
    textAlign: 'center',
    fontSize: 12,
    color: 'white',
    fontWeight: '700',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    // ...StyleSheet.absoluteFillObject,
    // For Android :
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
  tutorialContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9DD6EB',
    padding: 15,
  },
  textTitle: {
    color: '#fff',
    fontSize: 50,
    fontWeight: 'bold',
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
})
