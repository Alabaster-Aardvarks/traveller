// this is the router that instructs the server 'what to do' depending on which endpoint
const express = require('express');
const googleController = require('./googleController');
const router = express.Router(); 

//in the future we can do (/'endpoint', check Redis for result, googleAPIController)
router.get('/museum', (req, res) => {
  console.log('look for coordinates in here', req);
  googleController.getData('museum', lat, long, (data) => {
    console.log('google stuff', data);
    res.status(200).json(data);
  });
});



module.exports = router;