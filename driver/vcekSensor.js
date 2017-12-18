'use strict';

var util = require('util');

var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
//var logger = Sensor.getLogger('Sensor');
var vcek = require('../vcek');

function VcekSensor(sensorInfo, options) {
  var self = this;

  Sensor.call(self, sensorInfo, options);

  self.sequence = self.id.split('-')[2];
  self.prevValue = 0;
  self.prevTime = new Date().getTime();

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = VcekSensor.properties.dataTypes[self.model][0];

  vcek.on('data', function onData(data) {
    var result = {
      status: 'on',
      id: self.id,
      result: {},
      time: {}
    };

    result.result[self.dataType] = data[self.sequence];
    result.time[self.dataType] = self.prevTime = new Date().getTime();

    if (data[self.sequence] !== self.prevValue) {
      self.emit('change', result);
      self.prevValue = data[self.sequence];
    }
  });
}

VcekSensor.properties = {
  supportedNetworks: ['rs232-vcek'],
  dataTypes: {
    vcekTemperature: ['temperature'],
    vcekHumidity: ['humidity'],
    vcekNoise: ['noise'],
    vcekDust: ['dust'],
    vcekLight: ['light'],
    vcekWeight: ['weight']
  },
  models: [
    'vcekTemperature',
    'vcekHumidity',
    'vcekNoise',
    'vcekDust',
    'vcekLight',
    'vcekWeight'
  ],
  discoverable: false,
  addressable: true,
  recommendedInterval: 60000,
  maxInstances: 1,
  maxRetries: 8,
  idTemplate: '{gatewayId}-{deviceAddress}-{sequence}',
  category: 'sensor'
};

util.inherits(VcekSensor, Sensor);

VcekSensor.prototype._get = function (cb) {
  var self = this;
  var result = {
    status: 'on',
    id: self.id,
    result: {},
    time: {}
  };

  result.result[self.dataType] = self.prevValue;
  result.time[self.dataType] = self.prevTime;

  if (cb) {
    return cb(null, result);
  } else {
    self.emit('data', result);
  }
};

VcekSensor.prototype._enableChange = function () {
  vcek.registerSensor(this.id);
  vcek.startPolling();
};

VcekSensor.prototype._clear = function () {
  vcek.deregisterSensor(this.id);
  vcek.stopPolling();
};

module.exports = VcekSensor;
