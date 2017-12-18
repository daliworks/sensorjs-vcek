'use strict';

var sensorDriver = require('../../index'),
    Network = sensorDriver.Network,
    util = require('util');

// 1. Rename the network name 'RS232VCEK'
function RS232VCEK(options) {
  Network.call(this, 'rs232-vcek', options);
}

util.inherits(RS232VCEK, Network);

RS232VCEK.prototype.discover = function (networkName, options, cb) {
  return cb && cb(new Error('Not supported'));
};

module.exports = new RS232VCEK();
