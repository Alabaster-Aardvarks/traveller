// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const isoRouter = express.Router(); 

//in the future we can do (/'endpoint', check Redis for result, googleAPIController)
//refactor googleController's get functionality
//refactor router callback!
//
isoRouter.get('*', (req, res) => {
  console.log(req.query);
});

module.exports = isoRouter;