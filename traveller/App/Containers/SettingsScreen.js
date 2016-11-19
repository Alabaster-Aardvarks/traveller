// @flow

import React, { PropTypes } from 'react'
import { View, ScrollView, Switch, Picker, Text, TouchableOpacity, Image } from 'react-native'
import { connect } from 'react-redux'
import LoginActions, { isLoggedIn } from '../Redux/LoginRedux'
import TemperatureActions from '../Redux/TemperatureRedux'
import { Actions as NavigationActions } from 'react-native-router-flux'
import { Colors, Images, Metrics } from '../Themes'
import RoundedButton from '../Components/RoundedButton'
import FullButton from '../Components/FullButton'
import MapButtonGroup from '../Components/MapButtonGroup'
import { CheckBox, Card, Button, List, ListItem, ButtonGroup } from 'react-native-elements'
import CustomActionSheet from 'react-native-custom-action-sheet'

// external libs
// import PushNotification from 'react-native-push-notification'
import Icon from 'react-native-vector-icons/FontAwesome'
import * as Animatable from 'react-native-animatable'
import I18n from 'react-native-i18n'

// Styles
import styles from './Styles/SettingsScreenStyle'

class SettingsScreen extends React.Component {

  constructor (props) {
    super(props)
    this.state = {
      map: {type: 'Google Maps', marker: 'map-marker'},
      modalVisible: false,
      duration: 30,
      traffic: 'red',
      mileType: 'Normal',
      mapType: 'Miles'
    }
    this.setStateOfButtonGroup = this.setStateOfButtonGroup.bind(this)
  }


  componentWillReceiveProps (nextProps) {
    // Request push premissions only if the user has logged in.
    const { loggedIn } = nextProps
    if (loggedIn) {
      /*
      * If you have turned on Push in Xcode, http://i.imgur.com/qFDRhQr.png
      * uncomment this code below and import at top
      */
      // if (__DEV__) console.log('Requesting push notification permissions.')
      // PushNotification.requestPermissions()
    }
  }

  renderLoginButton () {
    return (
      <RoundedButton onPress={NavigationActions.login}>
        {I18n.t('signIn')}
      </RoundedButton>
    )
  }

  renderLogoutButton () {
    return (
      <RoundedButton onPress={this.props.logout}>
        {I18n.t('logOut')}
      </RoundedButton>
    )
  }

  renderHeader (title) {
    return (
      <View style={styles.componentLabelContainer}>
        <Text style={styles.componentLabel}>{title}</Text>
      </View>
    )
  }

  setStateOfButtonGroup (categoryType, categoryValue) {
    this.setState({[categoryType]: categoryValue})
  }


  render () {
    return (
      <View style={styles.mainContainer}>
        <Image source={Images.background} style={styles.backgroundImage} resizeMode='stretch' />
        <ScrollView style={styles.container}>
          {/* <View style={styles.section}>
            <Text style={styles.sectionText} >
              This is where settings go. test
            </Text>
          </View> */}

          {/* <Card title='Traffic'>
            <Text style={{marginBottom: 10}} >
              Traffic
            </Text>
            <Switch
              // onValueChange={(value) => this.setState({: value})}
              // value={this.state({value})}
              ></Switch>
          </Card> */}

          <CustomActionSheet modalVisible={this.state.modalVisible} onCancel={() => this.setState({modalVisible: false})} buttonText='Done'>
            <View>
              <Picker
                selectedValue={this.state.duration}
                onValueChange={(duration) => {
                  this.setState({duration})
                }}
                style={{ padding: 8, backgroundColor: 'white' }}
                >
                <Picker.Item label="30min" value="30" />
                <Picker.Item label="60min" value="60" />
                <Picker.Item label="90min" value="90" />
                <Picker.Item label="120min" value="120" />
                <Picker.Item label="150min" value="150" />
              </Picker>
            </View>
          </CustomActionSheet>

          {/* <List>
            {
              // list.map((item, i) => (
              //   <ListItem
              //     key={i}
              //     title={item.title}
              //     leftIcon={{name: item.icon}}
              //   />
              // ))
              <ListItem key={1} title={'Traffic'} onPress={() => window.alert('Cache Cleared!')}/>
            }
          </List>
          <Button
            raised
            icon={{name: 'cached'}}
            title='RAISED WITH ICON' />
          <CheckBox
            center
            title='Click Here to Remove This Item'
            iconRight
            iconType='material'
            checkedIcon='clear'
            uncheckedIcon='add'
            checkedColor='red'
            checked={false}
          />
          <Card
            title='CARD WITH DIVIDER'>

          </Card> */}
          <Button
            raised
            title={this.state.map.type}
            icon={{name: this.state.map.marker, type: 'font-awesome'}}
            buttonStyle={{borderRadius: 10}}
            onPress={() => {
                if (this.state.map.type === 'Google Maps') {
                  this.setState({map: {type: 'Apple Maps', marker: 'map-pin'}})
                } else if (this.state.map.type === 'Apple Maps') {
                  this.setState({map: {type: 'Google Maps', marker: 'map-marker'}})
                }
              }
            }
          />
          <Text style={styles.sectionText} >
            Choose map brand.
          </Text>
          <MapButtonGroup
            buttons={['Normal', 'Satellite', 'Terrain']}
            category={this.state.mapType}
            setStateOfButtonGroup={this.setStateOfButtonGroup}
          />
          <MapButtonGroup
            buttons={['Miles', 'Kilometers']}
            category={this.state.mileType}
            setStateOfButtonGroup={this.setStateOfButtonGroup}
          />
          {/* <ButtonGroup
            selectedIndex={1}
            onPress={() => console.tron.log(this)}
            buttons={['Normal', 'Satellite', 'Terrain']}
          /> */}
          <Text style={styles.sectionText} >
            Choose what map style you want to use.
          </Text>
          <ButtonGroup
            selectedIndex={0}
            onPress={() => console.tron.log(this.state)}
            buttons={['Miles', 'Kilometers']}
          />
          <Text style={styles.sectionText} >
            Choose type of distance
          </Text>

          {/* <Button
            raised
            title='Traffic'
            icon={{name: 'car', type: 'font-awesome'}}
            backgroundColor={this.state.traffic}
            onPress={() => {
              console.tron.log(this.state.traffic)
              if (this.state.traffic === 'red') {
                this.setState({traffic: 'green'})
              } else {
                this.setState({traffic: 'red'})
              }
            }} /> */}
            <Text style={styles.sectionText} >

            </Text>
            <Button
              raised
              title={this.state.duration + 'min isochrone duration'}
              icon={{name: 'clock-o', type: 'font-awesome'}}
              backgroundColor='blue'
              buttonStyle={{borderRadius: 10}}
              onPress={() => this.setState({modalVisible: true})}
            />
            <Text style={styles.sectionText} >

            </Text>
          <Button
            raised
            title='clear isochrone cache'
            icon={{name: 'trash', type: 'font-awesome'}}
            backgroundColor='red'
            buttonStyle={{borderRadius: 10}}
            onPress={() => window.alert('Cache Cleared!')}
          />
          {/* <RoundedButton text={this.state.map.type} onPress={() => this.setState({modalVisible: true})} />
          <RoundedButton text='clear isochrone cache' onPress={() => window.alert('Cache Cleared!')}/> */}
        </ScrollView>
      </View>
    )
  }
}

SettingsScreen.propTypes = {
  loggedIn: PropTypes.bool,
  temperature: PropTypes.number,
  city: PropTypes.string,
  logout: PropTypes.func,
  requestTemperature: PropTypes.func
}

const mapStateToProps = (state) => {
  return {
    loggedIn: isLoggedIn(state.login),
    temperature: state.temperature.temperature,
    city: state.temperature.city
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    logout: () => dispatch(LoginActions.logout()),
    requestTemperature: (city) => dispatch(TemperatureActions.temperatureRequest(city))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SettingsScreen)