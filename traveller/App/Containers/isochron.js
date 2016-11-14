import { create } from 'apisauce'
import { encode } from 'base-64'

// Navitia API token
const token = '3a8b7ce9-ef1a-4ff5-b65a-5cffcafcfc47';

// Set API headers
const api = create({ baseURL: 'https://api.navitia.io/v1' });
api.setHeaders({ 'Authorization': 'Basic ' + encode(token) });

let geojsonData = [];

export const loadIsochron = from => {

  // Isochron starting point
  from = from || [ 37.7825177, -122.4106772 ];

  // get region based on location
  return api.get(`/coord/${from[1]};${from[0]}`)
  .then(resp => {
    let region = resp.data.regions[0];
    //console.tron.log(region);

    let durations = [0, 600, 1200, 1800, 2400, 3000, 3600];

    return Promise.all(
      durations.map((duration, index) => {
        let minDuration = duration;
        let maxDuration = minDuration + 600;
        // Navitia query for this isochron
        //https://api.navitia.io/v1/coverage/us-ca/isochrones?from=-122.4106772%3B37.7825177&datetime=20161109T184927&boundary_duration%5B%5D=600&boundary_duration%5B%5D=1200&boundary_duration%5B%5D=1800&boundary_duration%5B%5D=2400&boundary_duration%5B%5D=3000&boundary_duration%5B%5D=3600&
        let url = `/coverage/${region}/isochrones?from=${from[1]};${from[0]}`
                  + `&datetime=20161109T184927`
                  + `&max_duration=${maxDuration}&min_duration=${minDuration}`;
                  //+ '&boundary_duration[]=600'; //&boundary_duration[]=1200&boundary_duration[]=1800&boundary_duration[]=2400&boundary_duration[]=3000&boundary_duration[]=3600';

        return api.get(url)
        .then(resp => drawIsochron(resp.data, index))
      })
    )
    .then(() => geojsonData) // return geoJSON data

    // Navitia query for this isochron
    // let maxDuration = 1200;
    // let isochronUrl = `https://api.navitia.io/v1/coverage/${region}/journeys?from=${from[1]};${from[0]}&max_duration=${maxDuration}`;
    //
    // axios({
    //   method: 'get',
    //   url: isochronUrl,
    //   headers: { Authorization: 'Basic ' + btoa(token) }
    // })
    // .then(resp => {
    //   let geojsonPoints = drawIsochronPoints.call(context, resp.data, maxDuration);
    //   this.setState({ geojsonLayer: [ geojsonPoints ] });
    // });
    //
  })
  .catch(err => console.tron.log('ERROR: Navitia region not found [' + err + ']'))
}

const drawIsochron = (result, index) => {
  result.isochrones.map(isochrone => {
    let polygon = isochrone.geojson;
    if (index) {
      geojsonData[index] = polygon;
    } else {
      geojsonData.push(polygon);
    }
  })
}
