// @flow

import React from 'react'
import { View, Text } from 'react-native'
import styles from './Styles/DumbComponentStyle'

export default class DumbComponent extends React.Component {

  render () {
    return (
      <View style={styles.container}>
        <Text>DumbComponent Component</Text>
      </View>
    )
  }
}

// // Prop type warnings
// DumbComponent.propTypes = {
//   someProperty: React.PropTypes.object,
//   someSetting: React.PropTypes.bool.isRequired
// }
//
// // Defaults for props
// DumbComponent.defaultProps = {
//   someSetting: false
// }
