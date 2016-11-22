import React, { PropTypes } from 'react'
import { View, ScrollView, Switch, Text, TouchableOpacity, Image } from 'react-native'
import { connect } from 'react-redux'
import MapActions from '../Redux/MapRedux'
import { Actions as NavigationActions } from 'react-native-router-flux'
import { Colors, Images, Metrics } from '../Themes'
import { CheckBox, Card, Button, List, ListItem, ButtonGroup } from 'react-native-elements'
import SettingsList from 'react-native-settings-list'

import Icon from 'react-native-vector-icons/FontAwesome'

// Styles
import styles from './Styles/SettingsScreenStyle'

class MapSelectScreen extends React.Component {

  render () {
    const { mapBrand, setMapBrand } = this.props

    return (
      <View style={styles.mainContainer}>
        <Image source={Images.background} style={styles.backgroundImage} resizeMode='stretch' />
        <ScrollView style={styles.container}>
          <View style={{flex:1}}>
            <View style={{flex:1}}>
              <SettingsList>
                {['Google Maps', 'Apple Maps'].map((mapName, index) =>
                  <SettingsList.Item
                    title={mapName}
                    key={index}
                    onPress={() => setMapBrand(mapName)}
                    arrowIcon={ ( <Icon name="check" size={14} color={(mapBrand === mapName) ? "blue" : "rgba(255,255,255,0)"} /> ) }
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

MapSelectScreen.propTypes = {
  mapBrand: PropTypes.string,
  setMapBrand: PropTypes.func
}

const mapStateToProps = state => {
  return {
    mapBrand: state.map.mapBrand
  }
}

const mapDispatchToProps = dispatch => {
  return {
    setMapBrand: mapName => dispatch(MapActions.setMapBrand(mapName))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(MapSelectScreen)
