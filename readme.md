# Leonidas

## `lib/*`

The files in `lib/` are intended to be single-purpose tools that get pulled together by another script.

- `cache.js` - Returns an object with `.get()`, `.set()`, and `.has()` methods that all return promises.
  - LRUCache - in memory cache
  - RedisCache - shared cache
- `iptables.js` - Wraps `iptables` commands with a Promise. Customized to do the things that this app needs.
- `poller.js` - Does SNMP polling. Returns
- `proxy.js` - Starts a udp server to catch polls and handle them by returning 1) the in-memory value, 2) the redis value, and 3 polling the device. The `messageHandler()` method is what does this.
- `watcher.js` - Watches the log and emits the IP that is a destination device that hasn't been handled yet.

## How-To

```bash
vagrant up
vagrant ssh router
sudo su -
cd /vagrant
# run commands from here
```
