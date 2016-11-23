const Redis = require('ioredis');
const redis = new Redis({
  port: 6379,          // Redis port
  host: 'redis-cache',   // Redis host, may have to revisit for test and production environment
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
      console.log('this place is not in the db, fall to navitia');
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
