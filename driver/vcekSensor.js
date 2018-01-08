'use strict';

var util = require('util');

var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
var logger = Sensor.getLogger('Sensor');
var vcek = require('../vcek');

function VcekSensor(sensorInfo, options) {
  var self = this;

  Sensor.call(self, sensorInfo, options);

  self.sequence = self.id.split('-')[2];
  self.deviceAddress = self.id.split('-')[1];
  self.gatewayId = self.id.split('-')[0];
  self.lastTime = 0;

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = VcekSensor.properties.dataTypes[self.model][0];

  vcek.on(self.sequence, function onData(data) {
    var result = {
      status: 'on',
      id: self.id,
      result: {},
      time: {}
    };

    if (data.senderNodeId !== self.deviceAddress) {
      logger.trace('Different device:', data.senderNodeId, self.deviceAddress);
      return;
    }

    result.result[self.dataType] = data.value;
    result.time[self.dataType] = self.lastTime = new Date().getTime();

    logger.debug('Data event:', self.id, result);

    self.emit('data', result);
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
  maxInstances: 99,
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
    //result: {},
    time: {}
  };

  if (new Date().getTime() - self.lastTime > self.properties.recommendedInterval * 1.5) {
    result.status = 'error';
    result.message = 'No data';
    if (cb) {
      return cb(new Error('no data'), result);
    } else {
      self.emit('data', result);
      return;
    }
  }

  result.time[self.dataType] = self.lastTime;

  logger.debug('Data get:', self.id, result);

  if (cb) {
    return cb(null, result);
  } else {
    self.emit('data', result);
  }
};

VcekSensor.prototype._enableChange = function () {
};

VcekSensor.prototype._clear = function () {
};

module.exports = VcekSensor;
