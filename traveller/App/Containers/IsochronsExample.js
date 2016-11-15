import React from 'react'
import { connect } from 'react-redux'
import { View, StyleSheet, Text, Dimensions } from 'react-native'
import MapView from 'react-native-maps'
import { calculateRegion } from '../Lib/MapHelpers'
import MapCallout from '../Components/MapCallout'
import Styles from './Styles/MapviewExampleStyle'
import { loadIsochron } from './isochron'
// import Svg, { Circle, Rect, Path } from 'react-native-svg'
//import { geojson } from './geoJSON'
// import earcut from 'earcut'

/* ***********************************************************
* IMPORTANT!!! Before you get started, if you are going to support Android,
* PLEASE generate your own API key and add it to android/app/src/main/AndroidManifest.xml
* We've included our API key for demonstration purposes only, and it will be regenerated from
* time to time. As such, neglecting to complete this step could potentially break your app in production!
* https://console.developers.google.com/apis/credentials
* Also, you'll need to enable Google Maps Android API for your project:
* https://console.developers.google.com/apis/api/maps_android_backend/
*************************************************************/

// Daniel - default values
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE = 37.78825;
const LONGITUDE = -122.4324;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const findColor = function (ratio, opacity) {
    var r = 255;
    var g = 255;
    if (ratio < 1/2) {
        r = Math.ceil(255 * ratio * 2);
    } else {
        g = Math.ceil(255 * (1 - ratio) * 2);
    }
    //var hex = sprintf('%02x%02x%02x', r, g, 0);
    return `rgba(${r}, ${g}, 0, ${opacity})`;
};

function fillColor (index, opacity) {
  return findColor(index/5.0, opacity);
}

//console.tron.log('first' + JSON.stringify(geojson.isochrones[0].geojson.coordinates));
let tesselate = false;
let polys = [];
loadIsochron()
.then(isochrones => {
  //console.tron.log(isochrones);
  for (let v = 0; v < (tesselate ? Math.min(4, isochrones.length) : isochrones.length); v++) {
    //if (v !== 3) { continue; }
    let geojson = isochrones[v];
    //console.tron.log(geojson);
    for (let i = 0; i < geojson.coordinates.length; i++) {
      //console.tron.display({ name: 'coordinates', value: geojson.coordinates[i] });
      if (!tesselate) {
        let poly = [];
        let holes = [];
        for (let a = 0; a < geojson.coordinates[i].length; a++) {
          let coordinates = geojson.coordinates[i][a];
          let p = [];
          for (let c = 0; c < coordinates.length; c++) {
            p.push({ longitude: coordinates[c][0], latitude: coordinates[c][1] });
          }
          if (a === 0) { // polygon
            poly = p;
          } else { // hole (inner polygon)
            holes.push(p);
          }
        }
        if (holes.length) {
          //console.tron.display({ name: 'holes', value: holes });
        }
        polys.push({ index: v, poly: poly, holes: holes });
      } else {
        let poly = [];
        let data = earcut.flatten(geojson.coordinates[i]);
        let result = earcut(data.vertices, data.holes, data.dimensions);
        let triangles = [];
        for (let r = 0; r < result.length; r++) {
          let index = result[r];
          triangles.push([ data.vertices[index * data.dimensions], data.vertices[index * data.dimensions + 1] ]);
        }
        for (let ts = 0; triangles && ts < triangles.length; ts += 3) {
          let t = triangles.slice(ts, ts + 3);
          polys.push({
            index: v,
            poly: [ { longitude: t[0][0], latitude: t[0][1] },
                    { longitude: t[1][0], latitude: t[1][1] },
                    { longitude: t[2][0], latitude: t[2][1] } ]
          });
        }
      }
    }
  }
})
.catch(err => console.tron.log(err));

class MapviewExample extends React.Component {
  /* ***********************************************************
  * This example is only intended to get you started with the basics.
  * There are TONS of options available from traffic to buildings to indoors to compass and more!
  * For full documentation, see https://github.com/lelandrichardson/react-native-maps
  *************************************************************/

  constructor (props) {
    super(props)
    /* ***********************************************************
    * STEP 1
    * Set the array of locations to be displayed on your map. You'll need to define at least
    * a latitude and longitude as well as any additional information you wish to display.
    *************************************************************/
    const locations = [
      { title: 'Location A', latitude: 37.78825, longitude: -122.4324 },
      { title: 'Location B', latitude: 37.75825, longitude: -122.4624 }
    ]
    /* ***********************************************************
    * STEP 2
    * Set your initial region either by dynamically calculating from a list of locations (as below)
    * or as a fixed point, eg: { latitude: 123, longitude: 123, latitudeDelta: 0.1, longitudeDelta: 0.1}
    *************************************************************/
    const region = calculateRegion(locations, { latPadding: 0.05, longPadding: 0.05 })
    this.state = {
      region: { // Daniel - default region state
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      locations,
      showUserLocation: true,
      zoom: 11
    }
    this.renderMapMarkers = this.renderMapMarkers.bind(this)
    this.onRegionChange = this.onRegionChange.bind(this)
  }

  componentWillReceiveProps (newProps) {
    /* ***********************************************************
    * STEP 3
    * If you wish to recenter the map on new locations any time the
    * Redux props change, do something like this:
    *************************************************************/
    // this.setState({
    //   region: calculateRegion(newProps.locations, { latPadding: 0.1, longPadding: 0.1 })
    // })
  }

  onRegionChange (region) {
    /* ***********************************************************
    * STEP 4
    * If you wish to fetch new locations when the user changes the
    * currently visible region, do something like this:
    *************************************************************/
    // const searchRegion = {
    //   ne_lat: newRegion.latitude + newRegion.latitudeDelta,
    //   ne_long: newRegion.longitude + newRegion.longitudeDelta,
    //   sw_lat: newRegion.latitude - newRegion.latitudeDelta,
    //   sw_long: newRegion.longitude - newRegion.longitudeDelta
    // }
    // Fetch new data...
    //

    // Daniel - when map dragged update region state
    this.setState({ region });
  }

  calloutPress (location) {
    /* ***********************************************************
    * STEP 5
    * Configure what will happen (if anything) when the user
    * presses your callout.
    *************************************************************/
    console.tron.log(location)
  }

  renderMapMarkers (location) {
    /* ***********************************************************
    * STEP 6
    * Customize the appearance and location of the map marker.
    * Customize the callout in ../Components/MapCallout.js
    *************************************************************/

    return (
      <MapView.Marker draggable key={location.title} coordinate={{latitude: location.latitude, longitude: location.longitude}}>
        <MapCallout location={location} onPress={this.calloutPress} />
      </MapView.Marker>
    )
  }
  render () {
    // StyleSheet.absoluteFill
    const coordinates = [ { latitude: LATITUDE, longitude: LONGITUDE },
                          { latitude: LATITUDE + 0.015, longitude: LONGITUDE - 0.015 },
                          { latitude: LATITUDE - 0.015, longitude: LONGITUDE - 0.005 } ];
    /*const coordinates = [ [ { latitude: LATITUDE, longitude: LONGITUDE },
                            { latitude: LATITUDE + 0.015, longitude: LONGITUDE - 0.015 },
                            { latitude: LATITUDE - 0.015, longitude: LONGITUDE - 0.005 } ],
                          [ { latitude: LATITUDE, longitude: LONGITUDE },
                            { latitude: LATITUDE + 0.015*0.5, longitude: LONGITUDE - 0.015*0.5 },
                            { latitude: LATITUDE - 0.015*0.5, longitude: LONGITUDE - 0.005*0.5 } ]
                        ];*/
    //           <MapView.Polygon coordinates={coordinates} fillColor='rgba(200,0,200,0.7)' key={0}/>

    return (
      <View style={Styles.container}>
        <MapView
          ref='map'
          provider={MapView.PROVIDER_GOOGLE}
          style={Styles.map}
          initialRegion={this.state.region}
          onRegionChangeComplete={this.onRegionChange}
          showsUserLocation={this.state.showUserLocation}
        >
          {this.state.locations.map((location) => this.renderMapMarkers(location))}
          {polys.map((poly, index) => {
            return (
              <MapView.Polygon
                style={{ zIndex: (10-poly.index)}}
                coordinates={poly.poly}
                holes={poly.holes}
                fillColor={ fillColor(poly.index, tesselate ? 0.35 : 0.35) }
                strokeWidth={1}
                strokeColor={ tesselate ? 'rgba(0,0,0,0)' : 'rgba(85, 85, 85, 0.8)' }
                key={index}
                zIndex={10-poly.index} />
            )
          })}
        </MapView>
        <View style={[styles.bubble, styles.latlng]}>
          <Text style={{ textAlign: 'center' }}>
            {this.state.region.latitude.toPrecision(7)},
            {this.state.region.longitude.toPrecision(7)}
          </Text>
        </View>
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    // ...redux state to props here
  }
}

// Daniel - Styles for the long/lat bubble, etc.
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  latlng: {
    width: 200,
    alignItems: 'stretch',
  },
  button: {
    width: 80,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: 'transparent',
  },
});

export default connect(mapStateToProps)(MapviewExample)
