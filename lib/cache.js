'use strict';

/*
This wraps .get(), .set(), and .has() calls with a Promise so that
they can be backed with as many layers of fall-backs as are appropriate
 */

const debug = require('debug')(`lib/cache`);
const LRU = require('lru-cache');
const redis = require('redis');
const config = require('config');

const { stringify } = JSON;

class LRUCache {
  constructor(options) {
    debug(`LRUCache()`);
    this.options = Object.assign({}, config.cache.lru, options);

    this.stats = {
      gets: 0,
      sets: 0,
      hit: 0,
      miss: 0
    };

    this.cache = LRU(this.options);
    debug(stringify(this.options));
  }

  get(key) {
    debug(`lru get(): ${key}`);
    return new Promise((resolve, reject) => {
      this.stats.gets += 1;
      const value = this.cache.get(key);

      if (value)
        this.stats.hit += 1;
      else
        this.stats.miss += 1;

      debug(`lru get: ${key} = ${stringify(value)}`);

      return resolve(value);
    });
  }

  set(key, value) {
    debug(`lru set(): ${key}, ${stringify(value)}`);
    return new Promise((resolve, reject) => {
      this.stats.sets += 1;

      this.cache.set(key, value);

      debug(`lru set(): ${key}`);
      return resolve();
    });
  }

  has(key) {
    debug(`lru has(): ${key}`);
    return new Promise((resolve, reject) => {
      const has = this.cache.has(key);

      debug(`lru has(): ${key}, ${has}`);

      return resolve(has);
    });
  }
};

class RedisCache {
  constructor(options) {
    debug(`RedisCache()`);
    this.options = Object.assign({}, config.cache.redis, options);

    this.stats = {
      gets: 0,
      sets: 0,
      hit: 0,
      miss: 0
    };

    this.cache = redis.createClient(this.options);
    debug(stringify(this.options));
  }

  get(key) {
    debug(`redis get(): ${key}`);
    return new Promise((resolve, reject) => {
      this.stats.gets += 1;

      this.cache.get(key, (err, value) => {
        if (err)
          return reject(err);

        if (value)
          this.stats.hit += 1;
        else
          this.stats.miss += 1;

        debug(`redis get(): ${key}, ${value}`);
        return resolve(value);
      });
    });
  }

  set(key, value) {
    debug(`redis set(): ${key}, ${value}`);
    return new Promise((resolve, reject) => {
      this.cache.set(key, value, `EX`, this.options.EX, (err) => {
        if (err)
          return reject(err);

        this.stats.sets += 1;

        debug(`redis set(): ${key}`);

        return resolve(value);
      });
    });
  }

  has(key) {
    debug(`redis has(): ${key}`);
    return new Promise((resolve, reject) => {
      this.cache.keys(key, (err, keys) => {
        if (err)
          return reject(err);

        debug(`redis has(): ${keys.length}`);

        if (keys.length)
          return resolve(true);
        else
          return resolve(false);
      });
    });
  }
};

module.exports = { LRUCache, RedisCache };
