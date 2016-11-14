# Traveller

### API

| Method | Uri          | Comment                          | 
|--------|--------------|----------------------------------|
| GET    | api/museum   | Nearby Museums                   |
| GET    | api/park     | Nearby Parks                     |
| GET    | api/bank     | Nearby Banks                     |
| GET    | isochrone/   | Query endpoint for Isochrone JSON|

### Setup Server Environment

```sh
> git clone 
> cd 
> npm install [or] yarn install
> touch .env [Google Places API KEY goes here]
> npm start [or] npm test [or] npm run start-dev
```
### Application Structure

```
|- ?                          //iOS app (react native stuff here)
|- spec/                      //Server Tests
  |- apiSpec.js               //API integration tests
  |- googleControllerSpec.js  //Google Places API Controller unit tests
|- example.env                //Sample of .env file, which must be written 
|- server.js                  //Server configuration file 
|- server/          
  |- api.js                   //general endpoint router
  |- isoRouter.js             //router for query strings
  |- googleController.js      //data manipulation of Google Places API results
|- package.json               //Dependencies for the server
|- .gitignore
```
