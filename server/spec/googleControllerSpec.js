const request = require('supertest');
const express = require('express');
const expect = require('chai').expect;
const app = require('../server.js');
const googleController = require('../server/googleController.js');

describe('getData', () => {
   
  //should have longitude and latitude as parameters
  //it should ahve a callback as a third parameter
  //it should return parsed JSON
});