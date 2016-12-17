// @flow

export const mapStateToProps = (state: Object) => {
  return {
    traffic: state.map.traffic,
    mapBrand: state.map.mapBrand,
    mapStyle: state.map.mapStyle,
    mapTile: state.map.mapTile,
    mapTileName: state.map.mapTileName,
    mapTileUrl: state.map.mapTileUrl,
    duration: state.map.duration,
    transportMode: state.map.transportMode,
    transportIcon: state.map.transportIcon,
    travelTimeName: state.map.travelTimeName,
    tutorialHasRun: state.map.tutorialHasRun === undefined ? true : state.map.tutorialHasRun,
    unitOfMeasurement: state.map.unitOfMeasurement,
  }
}
