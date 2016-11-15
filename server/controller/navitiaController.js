//controller for all Navitia API requests
const request = require('request');
const base64 = require('base-64');

const getIso = (url, callback) => {
  const auth = base64.encode(process.env.NAVITIA);
  console.log('this is the url', url);
  console.log('this is the auth', auth);
  request(url, {'Authorization': {'token': auth}}, (err, res, body) => {
    if (err) {
      //no iso data from navitia
      console.log(err, 'with reaching navitia');
      return callback(err, null);
    }
    //navitia has responded
    console.log(body);
    console.log('probably ignore', body);
    const data = JSON.parse(body);
    return callback(err, data);
  });
};

module.exports = {
  getIso
};