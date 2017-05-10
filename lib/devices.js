'use strict';

/*
This is a CRUD and subscription wrapper for devices
Do not keep state here!
 */

const debug = require('debug')(`lib/devices`);
const redis = require('redis');
const EventEmitter = require('events');
const os = require('os');
const config = require('config');

const { stringify, parse } = JSON;

class Devices extends EventEmitter {
  constructor(options) {
    super();

    this.id = Date.now();

    debug(`Devices()`);

    this.options = Object.assign({}, config.devices, options);

    this.client = redis.createClient(this.options.redis);

    this.publisher = redis.createClient(this.options.redis);
    this.subscriber = redis.createClient(this.options.redis);
    this.subscriber.on(`message`, (ch, key) => this.messageHandler(ch, key));

    debug(stringify(this.options));
  }

  start() {
    return Promise.resolve()
      .then(() => this.subscriber.subscribe(this.options.channel));
  }

  stop() {
    return Promise.resolve()
      .then(() => {
        this.subscriber.unsubscribe();
        this.subscriber.quit();
      });
  }

  create(device) {
    debug(`create(): ${stringify(device)}`);
    return new Promise((resolve, reject) => {
      if (!device || !device.ip)
        return reject(`You must provide an .ip property`);

      device.key = `device:${device.ip}`;

      this.client.set(device.key, stringify(device), (err) => {
        if (err)
          return reject(err);

        this.publisher.publish(this.options.channel, stringify({
          key: device.key,
          action: `created`
        }));

        return resolve();
      });
    });
  }

  read(key) {
    debug(`read(): ${key}`);
    return new Promise((resolve, reject) => {
      if (!key) {
        // read all the devices
        debug(`read(): all the keys`);
        this.keys()
          .then((keys) => Promise.all(keys.map((key) => this.read(key))))
          .then((devices) => {
            debug(`read(): redis keys() devices = ${devices.count}`);
            return resolve(devices);
          });
      } else {
        // read one device
        debug(`read(): redis get() ${key}`)
        this.client.get(key, (err, value) => {
          if (err)
            return reject(err);

          debug(`read(): redis get() result - ${key}, ${value}`);

          if (!value)
            return resolve(null);

          return resolve(parse(value));
        });
      }
    });
  }

  update(device) {
    return new Promise((resolve, reject) => {
      if (!device || !device.key)
        throw new Error(`Your device must have a key property: ${stringify(device)}`);

      this.client.set(device.key, stringify(device), (err) => {
        if (err)
          return reject(err);

        this.publisher.publish(this.options.channel, stringify({
          key: device.key,
          action: `updated`
        }));

        return resolve();
      });
    });
  }

  delete(key) {
    return new Promise((resolve, reject) => {
      const { channel } = this.options;

      this.client.del(key, (err) => {
        if (err)
          return reject(err);

        this.publisher.publish(channel, stringify({ key, action: `deleted` }));

        return resolve();
      });
    });
  }

  keys() {
    return new Promise((resolve, reject) => {
      this.client.keys(`device:*`, (err, keys) => {
        if (err)
          return reject(err);

        return resolve(keys);
      });
    });
  }

  messageHandler(ch, message) {
    debug(`messageHandler(): ${ch}, ${message}`);
    const { channel } = this.options;

    if (ch !== channel)
      return false;

    const { key, action } = parse(message);

    debug(`messageHandler(): action - ${key}, ${action}`);

    if (action === `created` || action === `updated`)
      this.read(key)
        .then((device) => this.emit(action, device))
        .catch((err) => console.log(err));
    else
      this.emit(action, key);
  }
};

module.exports = { Devices };
