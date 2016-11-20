import React, { PropTypes } from 'react'
import { View, ScrollView, Switch, Picker, Text, TouchableOpacity, Image } from 'react-native'
import { connect } from 'react-redux'
import LoginActions, { isLoggedIn } from '../Redux/LoginRedux'
import TemperatureActions from '../Redux/TemperatureRedux'
import MapActions from '../Redux/MapRedux'
import { Actions as NavigationActions } from 'react-native-router-flux'
import { Colors, Images, Metrics } from '../Themes'
import RoundedButton from '../Components/RoundedButton'
import FullButton from '../Components/FullButton'
import MapButtonGroup from '../Components/MapButtonGroup'
import { CheckBox, Card, Button, List, ListItem, ButtonGroup } from 'react-native-elements'
import CustomActionSheet from 'react-native-custom-action-sheet'
import SettingsList from 'react-native-settings-list';

import Icon from 'react-native-vector-icons/FontAwesome'

// Styles
import styles from './Styles/SettingsScreenStyle'

class MaxDurationScreen extends React.Component {

  // constructor (props: Object) {
  //   super(props)
  //   this.state = {
  //     modalVisible: false
  //   }
  // }

  render () {
    return (
      <View style={styles.mainContainer}>
        <Image source={Images.background} style={styles.backgroundImage} resizeMode='stretch' />
        <ScrollView style={styles.container}>
          {/* <CustomActionSheet modalVisible={this.state.modalVisible} onCancel={() => this.setState({modalVisible: false})} buttonText='Done'> */}
            {/* <View> */}
              <Picker
                selectedValue={this.props.map.duration}
                onValueChange={this.props.setMaxDuration}
                style={{backgroundColor: 'white'}}
                >
                <Picker.Item label="30min" value={30} />
                <Picker.Item label="60min" value={60} />
                <Picker.Item label="90min" value={90} />
                <Picker.Item label="120min" value={120} />
                <Picker.Item label="150min" value={150} />
              </Picker>
              <SettingsList>
              <SettingsList.Item
                title='Clear isochrone cache'
                hasNavArrow={false}
                titleStyle={{color: 'blue'}}
                onPress={() => console.tron.log(this.props)} />
                </SettingsList>
            {/* </View> */}
          {/* </CustomActionSheet> */}
        </ScrollView>
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    map: state.map,
    duration: state.duration,
    traffic: state.traffic,
    mileType: state.mileType,
    mapType: state.mapType
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setMaxDuration: (duration) => dispatch(MapActions.setMaxDuration(duration))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(MaxDurationScreen)
