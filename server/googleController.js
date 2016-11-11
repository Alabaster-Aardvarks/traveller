const request = require('request');
//google API url - may have to adjust the radius part of the query
const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?&radius=500&key=${process.env.GOOGLEKEY}`;

const getData = (type, lat, long, cb) => {
  //hard coding to be replaced once client sends lat and long
  //delete 10 and 11 once we are getting location data from the client
  lat = lat || 37.7825177;
  long = long || -122.4106772;

  return request(`${url}&type=${type}&location${lat},${long}`, (err, data) => {
    if (err) {
      console.log('no places found by google');
      return cb(err, null);
    }
    return cb(data);
  });
};

module.exports = {
  getData
};
//replace line 10's first parameter with 
// `${url}&type=${typeOfLocation}&location=${currentLocation}`
// replace #8 with callback