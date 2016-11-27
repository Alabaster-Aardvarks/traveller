const param = require('jquery-param');
const axios = require('axios');

function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function parseArguments(url, data, success, dataType) {
  if (isFunction(data)) dataType = success, success = data, data = undefined
  if (!isFunction(success)) dataType = success, success = undefined
  return {
    url: url
  , data: data
  , success: success
  , dataType: dataType
  }
}

const ajax = options => {
  //console.log('ajax', options)

  axios({
    method: options.type.toLowerCase(),
    url: options.url,
    responseType: options.dataType,
    timeout: options.timeout
  })
  .then(resp => {
    let data = resp.request._response.replace(/^\?\((.*)\)$/, '$1')
    //console.log('ajax response', JSON.parse(data))
    options.success(JSON.parse(data))
  })
  .catch(err => {
    console.error(err)
    options.error(err)
  })
};

const getJSON = () => {
  let options = parseArguments.apply(null, arguments)
  options.dataType = 'json'
  return ajax(options)
};

module.exports = {
  param: param,
  ajax: ajax,
  getJSON: getJSON
}
