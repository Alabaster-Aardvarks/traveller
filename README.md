[![CircleCI](https://circleci.com/gh/Alabaster-Aardvarks/traveller/tree/develop.svg?style=svg)](https://circleci.com/gh/Alabaster-Aardvarks/traveller/tree/develop)

[![Stories in Ready](https://badge.waffle.io/Alabaster-Aardvarks/traveller.svg?label=ready&title=Ready)](http://waffle.io/Alabaster-Aardvarks/traveller)

#  traveller
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

* Standard compliant React Native App Utilizing [Ignite](https://github.com/infinitered/ignite)

## ⬆️ How to Setup

**Step 1:** git clone this repo:

**Step 2:** cd to the cloned repo:

**Step 3:** Install the Application with `npm install`


## ▶️ How to Run App

1. cd to the repo
2. Run Build for either OS
  * for iOS
    * run `react-native run-ios`
  * for Android
    * Run Genymotion
    * run `react-native run-android`

## 🚫 Standard Compliant

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
This project adheres to Standard.  Our CI enforces this, so we suggest you enable linting to keep your project compliant during development.

**To Lint on Commit**

This is implemented using [ghooks](https://github.com/gtramontina/ghooks). There is no additional setup needed.

**Bypass Lint**

If you have to bypass lint for a special commit that you will come back and clean (pushing something to a branch etc.) then you can bypass git hooks with adding `--no-verify` to your commit command.

**Understanding Linting Errors**

The linting rules are from JS Standard and React-Standard.  [Regular JS errors can be found with descriptions here](http://eslint.org/docs/rules/), while [React errors and descriptions can be found here](https://github.com/yannickcr/eslint-plugin-react).

## 🔐 Secrets

This project uses [react-native-config](https://github.com/luggit/react-native-config) to expose config variables to your javascript code in React Native. You can store API keys
and other sensitive information in a `.env` file:

```
API_URL=https://myapi.com
GOOGLE_MAPS_API_KEY=abcdefgh
```

and access them from React Native like so:

```
import Secrets from 'react-native-config'

Secrets.API_URL  // 'https://myapi.com'
Secrets.GOOGLE_MAPS_API_KEY  // 'abcdefgh'
```

The `.env` file is ignored by git keeping those secrets out of your repo.

## 📂 Related Articles
Ignite Documentation - [Ignite Wiki https://github.com/infinitered/ignite/wiki](https://github.com/infinitered/ignite/wiki)

# Traveller Server

### API

| Method | Uri            | Comment                           | 
|--------|----------------|-----------------------------------|
| GET    | places/cafe    | Nearby Cafes                      |
| GET    | places/health  | Nearby Medical Facilities         |
| GET    | places/bank    | Nearby Banks                      |
| GET    | places/transit | Nearby Public Transit Locations   |
| GET    | places/police  | Nearby Police Station             |
| GET    | navitia/       | Isochrone JSON Data               |


### Redis Installation
brew install redis OR [GO HERE](http://redis.io/download)
brew services start redis - will have redis running in the background

### Setup Server Environment

```sh
> git clone 
> cd server
> npm install [or] yarn install
> touch .env [Google Places API KEY goes here]
> npm start [or] npm test [or] npm run start-dev [or] npm run all
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
    |- navitiaController.js     //Navitia API Handler
  |- node_modules/              //Server dependencies
  |- router/          
    |- placesRouter.js          //Google Places API routes
    |- navitiaRouter.js         //router for Navitia API
  |- package.json               //Dependencies for the server
  |- spec                       //Server-side tests
    |- placesAPISpec.js         //Integration Tests for Google Places API
    |- placesControllerSpec.js  //Unit tests for Google Places API
    |- navitiaControllerSpec.js //Unit tests for Navitia API                      
  |- .gitignore
|- example.env                  //follow this format to hide api keys in .env
|- .env                         //API keys live here
 ```
