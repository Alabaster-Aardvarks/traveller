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

class TransportModeScreen extends React.Component {

  render () {
    const { transportMode, setTransportMode } = this.props

    return (
      <View style={styles.mainContainer}>
        <Image source={Images.background} style={styles.backgroundImage} resizeMode='stretch' />
        <ScrollView style={styles.container}>
          <View style={{flex:1}}>
            <View style={{flex:1}}>
              <SettingsList borderColor='#c8c7cc' defaultItemSize={50}>
                <SettingsList.Header />
                  {[ 'Walk', 'Bike', 'Car', 'Transit'].map((transportModeName, index) =>
                    <SettingsList.Item
                      title={transportModeName}
                      key={index}
                      onPress={() => setTransportMode(transportModeName)}
                      arrowIcon={ ( <Icon name="check" size={14} style={{ paddingRight: 20, paddingTop: 20 }} color={(transportMode === transportModeName) ? "blue" : "rgba(255,255,255,0)"} /> ) }
                    />
                  )}
              </SettingsList>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    transportMode: state.map.transportMode
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setTransportMode: (transportModeName) => dispatch(MapActions.setTransportMode(transportModeName))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(TransportModeScreen)
