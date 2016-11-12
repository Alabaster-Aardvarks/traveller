//helper functions to help with server request handling, pretty
const sendJson = (err, data, req, res) => {
  console.log(err, data);
  if (err) {
    //parsing error
    return res.send(err);
  } else {
    //sending back the client response
    if (data === null) {
      //data was not found
      return res.sendStatus(204); 
    } else {
      //data is found
      return res.status(200).json(data); 
    }
  }
};

module.exports = {
  sendJson
};
