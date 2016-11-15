# Traveller

### API

| Method | Uri           | Comment                           | 
|--------|---------------|-----------------------------------|
| GET    | places/museum | Nearby Museums                    |
| GET    | places/park   | Nearby Parks                      |
| GET    | places/bank   | Nearby Banks                      |
| GET    | iso/          | Query endpoint for Isochrone JSON |

### Setup Server Environment

```sh
> git clone 
> cd server
> npm install [or] yarn install
> touch .env [Google Places API KEY goes here]
> npm start [or] npm test [or] npm run start-dev
```

### iOS Client Environment (from project root after cloning)

```sh 
> cd traveller
> yarn install [or] npm install
> npm install (yarn will not install one of the dependencies)
> cd ios
> pod install
> cd ..
> react-native run-ios
```

### Server Structure

```
|- server               
  |- server.js                  //Configuration for Express Server
  |- controller/                //External API Controllers
    |- placesController.js      //Google Places API Handler
  |- node_modules/              //Server dependencies
  |- router/          
    |- placesRouter.js          //Google Places API routes
    |- isoRouter.js             //router for isochronal query strings
  |- package.json               //Dependencies for the server
  |- spec                       //Server-side tests
    |- placesAPISpec.js         //Integration Tests for Google Places API
    |- placesControllerSpec.js  //Unit tests for Google Places API                
  |- .gitignore
|- example.env                  //follow this format to hide api keys in .env
|- .env                         //API keys live here
 ```
