// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const googleController = require('./googleController');
const router = express.Router(); 

//in the future we can do (/'endpoint', check Redis for result, googleAPIController)
//refactor googleController's get functionality
//refactor router callback!
//
router.get('/museum', (req, res) => {
  // console.log('look for coordinates in here', req);
  googleController.getData('museum', 37.7825177, -122.4106772, (err, data) =>{
    if (err) {
      //parsing error
      res.send(err);
    } else {
      //sending back the client response
      if (data === null) {
        //data was not found
        res.sendStatus(204); 
      } else {
        //data is found
        res.status(200).json(data); 
      }
    }
  });
});

router.get('/park', (req, res) => {
  // console.log('look for coordinates in here', req);
  googleController.getData('park', 37.7825177, -122.4106772, (err, data) =>{
    if (err) {
      //parsing error
      res.send(err);
    } else {
      //sending back the client response
      if (data === null) {
        //data was not found
        res.sendStatus(204); 
      } else {
        //data is found
        res.status(200).json(data); 
      }
    }
  });
});

router.get('/bank', (req, res) => {
  // console.log('look for coordinates in here', req);
  googleController.getData('bank', 37.7825177, -122.4106772, (err, data) =>{
    if (err) {
      //parsing error
      res.send(err);
    } else {
      //sending back the client response
      if (data === null) {
        //data was not found
        res.sendStatus(204); 
      } else {
        //data is found
        res.status(200).json(data); 
      }
    }
  });
});




//404 all other routes
router.use('*', (req, res) => {
  res.status(404).send();
});

module.exports = router;