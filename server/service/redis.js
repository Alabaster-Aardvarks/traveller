const Redis = require('ioredis');
const redis = new Redis({
  port: 6379,          // Redis port
  //deployment host
  // host: 'redis-cache', 
  // development host
  host: '127.0.0.1',
  db: 0
});
redis.config('set', 'maxmemory-policy', 'allkeys-lru');

const setRedisIso = (url, data) => {
  let value = JSON.stringify(data);
  redis.set(url, value)
  .catch(error=>error);
};

const getRedisIso = (url) => {
  return redis.get(url)
  .then(result => {
    if (result === null) {
      console.log('this place is not in the db, fall to iso provider');
      return result;
    } else {
      console.log('here is the cached result');
      return result;
    }
  })
  .catch(err => err);
};

module.exports = {
  setRedisIso, getRedisIso, redis
};
