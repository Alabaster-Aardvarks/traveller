//controller for all here API requests
const axios = require('axios');
const base64 = require('base-64');

// debug ====================================================================
const debug = require('debug');
//debug.enable('hereController:*');
const log = debug('hereController:log');
const info = debug('hereController:info');
const error = debug('hereController:error');

let authQuery;

const setKey = (code, id) => {
  authQuery = `&app_code=${code}&app_id=${id}`;
  log(authQuery);
};

const getIso = (url) => {

  log('##########here', url+authQuery);
  return axios({
    method: 'get',
    url: url + authQuery,
  })
  .then(response => {
    log('here response', response.data);
    return response.data;
  })
 .catch(error => console.error(error));
};

module.exports = {
  getIso, setKey
};
