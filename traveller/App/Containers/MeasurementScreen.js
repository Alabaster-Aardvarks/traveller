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

class MeasurementScreen extends React.Component {
  render () {
    const { unitOfMeasurement, setUnitOfMeasurement } = this.props

    return (
      <View style={styles.mainContainer}>
        <Image source={Images.background} style={styles.backgroundImage} resizeMode='stretch' />
        <ScrollView style={styles.container}>
          <SettingsList borderColor='#c8c7cc' defaultItemSize={50}>
            {['Miles', 'Kilometers'].map((unit, index) =>
              <SettingsList.Item
                title={unit}
                key={index}
                onPress={() => setUnitOfMeasurement(unit)}
                arrowIcon={ ( <Icon name="check" size={14} style={{ paddingRight: 20, paddingTop: 20 }} color={(unitOfMeasurement === unit) ? "#0079fe" : "rgba(255,255,255,0)"} /> ) }
              />
            )}
          </SettingsList>
        </ScrollView>
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    unitOfMeasurement: state.map.unitOfMeasurement,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setUnitOfMeasurement: (unitOfMeasurement) => dispatch(MapActions.setUnitOfMeasurement(unitOfMeasurement))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(MeasurementScreen)
