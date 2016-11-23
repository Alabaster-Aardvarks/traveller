import React, { PropTypes } from 'react'
import { View, ScrollView, Switch, Picker, Text, TouchableOpacity, Image } from 'react-native'
import { connect } from 'react-redux'
import MapActions from '../Redux/MapRedux'
import { Actions as NavigationActions } from 'react-native-router-flux'
import { Colors, Images, Metrics } from '../Themes'
import { CheckBox, Card, Button, List, ListItem, ButtonGroup } from 'react-native-elements'
import SettingsList from 'react-native-settings-list';

import Icon from 'react-native-vector-icons/FontAwesome'

// Styles
import styles from './Styles/SettingsScreenStyle'

class MaxDurationScreen extends React.Component {
  render () {
    const { duration, setMaxDuration } = this.props

    return (
      <View style={styles.mainContainer}>
        <Image source={Images.background} style={styles.backgroundImage} resizeMode='stretch' />
        <ScrollView style={styles.container}>
              <Picker
                selectedValue={duration}
                onValueChange={setMaxDuration}
                style={{backgroundColor: 'white'}}
                >
                {[30, 60, 90, 120, 150].map((time, index) => <Picker.Item label={time + "min"} value={time} key={index} />)}
              </Picker>
        </ScrollView>
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    duration: state.map.duration,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setMaxDuration: (duration) => dispatch(MapActions.setMaxDuration(duration))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(MaxDurationScreen)
