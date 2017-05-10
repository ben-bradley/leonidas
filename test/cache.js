'use strict';

require('should');
const { LRUCache, RedisCache } = require('../lib/cache');

const key = `${Date.now()}`;
const value = `${Date.now()}`;

describe(`LRUCache`, () => {
  let cache;

  beforeEach(() => cache = new LRUCache());
  afterEach(() => cache = new LRUCache());

  it(`should have .get(), .set(), and .has() methods`, () => {
    (cache).should.be.an.instanceof(LRUCache);
    (cache).should.have.properties([ `get`, `set`, `has` ]);
  });

  it(`methods should return promises`, () => {
    (cache.get(key)).should.be.a.Promise();
    (cache.set(key, value)).should.be.a.Promise();
    (cache.has(key)).should.be.a.Promise();
  });

  it(`should .set() a value`, () => cache.set(key, value));

  it(`should .get() a value`, () =>
    cache.set(key, value)
      .then(() => cache.get(key))
      .then((v) => (v).should.eql(value))
    );

  it(`should return a bln from .has()`, () =>
    cache.set(key, value)
      .then(() => cache.has(key))
      .then((v) => (v).should.eql(true))
    );
});

describe(`RedisCache`, () => {
  let cache;

  beforeEach(() => cache = new RedisCache());
  afterEach(() => cache = new RedisCache());

  it(`should have .get(), .set(), and .has() methods`, () => {
    (cache).should.be.an.instanceof(RedisCache);
    (cache).should.have.properties([ `get`, `set`, `has` ]);
  });

  it(`methods should return promises`, () => {
    (cache.get(key)).should.be.a.Promise();
    (cache.set(key, value)).should.be.a.Promise();
    (cache.has(key)).should.be.a.Promise();
  });

  it(`should .set() a value`, () => cache.set(key, value));

  it(`should .get() a value`, () =>
    cache.set(key, value)
      .then(() => cache.get(key))
      .then((v) => (v).should.eql(value))
    );

  it(`should return a bln from .has()`, () =>
    cache.set(key, value)
      .then(() => cache.has(key))
      .then((v) => (v).should.eql(true))
    );
});
