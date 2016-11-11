const request = require('request');
//google API url - may have to adjust the radius part of the query
const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?&radius=500';

const getMuseumData = (lat, long, callback) => {
  //hard coding to be replaced once client sends lat and long
  //delete 10 and 11 once we are getting location data from the client
  lat = lat || 37.7825177;
  long = long || -122.4106772;
  request(`${url}&type=museum&location=${lat},${long}&key=${process.env.GOOGLEKEY}`, (err, res, body) => {
    if (err) {
      console.log('no places found by google');
      callback(err, null);
    }
    console.log('google response', body);
    callback(err, body);
  });
};

module.exports = {
  getMuseumData
};
//replace line 10's first parameter with 
// `${url}&type=${typeOfLocation}&location=${currentLocation}`
// replace #8 with callback