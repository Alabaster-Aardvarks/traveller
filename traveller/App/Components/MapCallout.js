import React from 'react'
import { Text, View, TouchableOpacity, TouchableHighlight } from 'react-native'
import MapView from 'react-native-maps'
import Ionicons from 'react-native-vector-icons/Ionicons'
import Icon from 'react-native-vector-icons/FontAwesome'
import Styles from './Styles/MapCalloutStyle'

type MapCalloutProps = {
  location: Object,
  onPress: () => void
}

export default class MapCallout extends React.Component {
  props: MapCalloutProps

  constructor (props: MapCalloutProps) {
    super(props)
    this.onPress = this.props.onPress.bind(this, this.props.location)
  }

  render () {
    // Note: if you don't want your callout surrounded by the default tooltip, pass `tooltip={true}` to `MapView.Callout`
    // FIXME: reference colors instead of hardcoding them #2F81B8
    const { location } = this.props
    return (
      <MapView.Callout style={Styles.callout} onPress={ e => this.onPress(e.nativeEvent) }>
        <View>
          <Text>{location.title}</Text>
          { !location.subtitle ? undefined : (
            <Text style={Styles.calloutSubtitle}>{location.subtitle}</Text>
          )}
        </View>
        { !location.url ? undefined : (
            <TouchableOpacity onPress={ () => this.onPress() }>
              <View style={ { marginLeft: 10, alignSelf: 'flex-start' } } onPress={ () => console.log('icon view') }>
                  <Icon name='chevron-circle-right' style={ { fontSize: 20, color: '#3B9AD9', width: 20, height: 20 } }/>
              </View>
            </TouchableOpacity>
          )
        }
      </MapView.Callout>
    )
  }
}
