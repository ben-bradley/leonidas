'use strict';

/*
This is the core app. It binds together all of the components in lib/ and
makes them work together. State is tracked here.
 */

const debug = require('debug')(`app`);
const redis = require('redis');

const { LRUCache, RedisCache } = require('./lib/cache');
const { Devices, Device } = require('./lib/devices');
const { iptables } = require('./lib/iptables');
const { Poller } = require('./lib/poller');
const { Proxy } = require('./lib/proxy');
const { Watcher } = require('./lib/watcher');

/*
1. Read the list of devices and start a proxy for each
2. Subscribe to the devices channel to be notified of host events
3. Start the watcher
 */

const app = {
  state: {},
  watcher: new Watcher(),
  devices: new Devices(),
  lruCache: new LRUCache(),
  redisCache: new RedisCache()
}

const init = () => {
  return Promise.resolve()
  // devices.create(new Device({ ip: `192.168.20.2` }))
    .then(() => devices.read())
    .then((devices) => Promise.all(devices.map((device) => createDevice(device))))
    .then((devices) => app.state.devices = devices)
    .then(() => {
      app.state.devices.on(`created`, (device) => createDevice(device));
      app.state.devices.on(`updated`, (device) => updateDevice(device));
      app.state.devices.on(`deleted`, (device) => deleteDevice(device));
    })
    .catch((err) => console.log(err));
};

const createDevice = (device) => new Promise((resolve, reject) => {
  if (device.handler === `proxy`) {
    console.log(`start proxy for ${device.stringify()}`);
  }
  else if (device.handler === `passthrough`) {
    console.log(`start a passthrough for ${device.stringify()}`);
  }
  return resolve()
});

init();
