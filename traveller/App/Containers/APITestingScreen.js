// @flow

import React from 'react'
import { ScrollView, View, Text, TouchableOpacity, Image } from 'react-native'
import { Metrics, Images } from '../Themes'
import FullButton from '../Components/FullButton'

// For API
//the services API page is 'hooked' up to our AWS places api
import API from '../Services/Api'
import FJSON from 'format-json'

/// Styles
import styles from './Styles/APITestingScreenStyle'

// API buttons here:
// this 'pattern' for endpoints, is kind of deceptive, the endpoint: is really the 
// api service function and the args are the ACTUAL endpoint 
const endpoints = [
  { label: 'Get Police', endpoint: 'getData', args: ['places/police'] },
  { label: 'Get Cafe', endpoint: 'getData', args: ['places/cafe'] },
  { label: 'Get Transit', endpoint: 'getData', args: ['places/transit'] },
  { label: 'Get Bank', endpoint: 'getData', args: ['places/bank'] },
  { label: 'Get Medical', endpoint: 'getData', args: ['places/medical'] }
]

const debug = true

export default class APITestingScreen extends React.Component {
  
  api:  Object
  //unnecessary line #33
  debug:true

  state: {
    visibleHeight: number
  }

  constructor (props: Object) {
    super(props)
    this.state = {
      visibleHeight: Metrics.screenHeight
    }

    this.api = API.create()
  }

  showResult (response: Object, title: string = 'Response') {
    this.refs.container.scrollTo({x: 0, y: 0, animated: true})
    if (response.ok) {
      //this actually will be what's displayed on the top 1/2 of the page
      //right now, we only know that the code is working, response.body is "too big?"
      this.refs.result.setState({message: response.status, title: title})
    } else {
      this.refs.result.setState({message: `${response.problem} - ${response.status}`, title: title})
    }
  }

  tryEndpoint (apiEndpoint: Object) {
    const { label, endpoint, args = [''] } = apiEndpoint
    this.api[endpoint].apply(this, args).then((result) => {
      this.showResult(result, label || `${endpoint}(${args.join(', ')})`)
    }).catch(error=>{message: error})
  }

  renderButton (apiEndpoint: Object) {
    const { label, endpoint, args = [''] } = apiEndpoint
    return (
      <FullButton text={label || `${endpoint}(${args.join(', ')})`} onPress={this.tryEndpoint.bind(this, apiEndpoint)} styles={{marginTop: 10}} key={`${endpoint}-${args.join('-')}`} />
    )
  }

  renderButtons () {
    return endpoints.map((endpoint) => this.renderButton(endpoint))
  }

  render () {
    return (
      <View style={styles.mainContainer}>
        <Image source={Images.background} style={styles.backgroundImage} resizeMode='stretch' />
        <ScrollView style={styles.container} ref='container'>

          <View style={styles.section}>
            <Text style={styles.sectionText}>
              Testing API with Postman or APIary.io verifies the server works.
              The API Test screen is the next step; a simple in-app way to verify and debug your in-app API functions.
            </Text>
            <Text style={styles.sectionText}>
              Create new endpoints in Services/Api.js then add example uses to endpoints array in Containers/APITestingScreen.js
            </Text>
          </View>
          {this.renderButtons()}
          <APIResult ref='result' />
        </ScrollView>
      </View>
    )
  }
}

class APIResult extends React.Component {

  state: {
    message: boolean,
    title: boolean
  }

  constructor (props) {
    super(props)
    this.state = {
      message: false,
      title: false
    }
  }

  onApiPress = () => {
    this.setState({message: false})
  }
    //will display test result return
  renderView () {
    return (
      <ScrollView style={{ top: 0, bottom: 0, left: 0, right: 0, position: 'absolute' }} overflow='hidden'>
        <TouchableOpacity
          style={{backgroundColor: 'white', padding: 20}}
          onPress={this.onApiPress}
        >
          <Text>{this.state.title} API Status:</Text>
          <Text allowFontScaling={false} style={{fontFamily: 'CourierNewPS-BoldMT', fontSize: 10}}>
            {this.state.message} 
          </Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  render () {
    let messageView = null
    if (this.state.message) {
      return this.renderView()
    }

    return messageView
  }
}