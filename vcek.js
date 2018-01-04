'use strict';

var util = require('util');
var SerialPort = require('serialport');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var logger = require('./index').Sensor.getLogger('Sensor');

var serialOpts = {
  baudRate: 115200,
  parity: 'none',
  parser: SerialPort.parsers.readline('0D0A')
};

var SERIAL_PORT_FILE = '/dev/ttyS0';
//var POLLING_INTERVAL = 1000;    // 1 sec
var RETRY_OPEN_INTERVAL = 3000; // 3sec

function isInvalid() {
  return false;
}

function parseMessage(data) {
  var result = {};
  var dataArray = new Buffer(data).toString().split(';');

  result.receiverNodeId = dataArray[0];
  result.senderNodeId = dataArray[1];
  result.sensorId = dataArray[2];
  result.sensorType = dataArray[3];
  result.value = parseInt(dataArray[4]);

  logger.trace('Parsed:', result);

  return result;
}

function openSerialPort(vcek, cb) {
  var self;

  if (_.isFunction(vcek)) {
    self = module.exports;
    cb = vcek;
  } else {
    self = vcek;
  }

  self.port = new SerialPort(SERIAL_PORT_FILE, serialOpts, function onOpen(err) {
    logger.info('[Vcek] Connected');

    if (err) {
      logger.error('Serial port error during opening:', err);

      return cb && cb(err);
    } else {
      logger.info('[Vcek] No err, Connected');
    }

    self.port.on('error', function onError(err) {
      logger.error('Serial port error:', err);

      return;
    });

    self.port.on('close', function onError(err) {
      if (err) {
        logger.error('Serial port error during closing:', err);
        // TODO: if error, isn't this closed?
      } else {
        logger.info('Serial port is closed');
      }

      return;
    });

    self.port.on('disconnect', function onError(err) {
      logger.error('Serial port is disconnected:', err);

      return;
    });

    self.isOpen = true;

    self.port.on('data', function onData(data) {
      var parsedData;

      logger.trace('[Vcek] onData():', new Buffer(data).toString());

      if (isInvalid(data)) {
        logger.error('Invalid message:', new Buffer(data).toString());

        return;
      }

      parsedData = parseMessage(data);

      self.emit('data', parsedData);
    });
  });
}

function openSerialCallback(/*err*/) {
  setTimeout(function () {
    openSerialPort(openSerialCallback);
  }, RETRY_OPEN_INTERVAL);
}

// TODO: If opening port takes long time, async function cannot be finished.
function Vcek () {
  var self = this;

  EventEmitter.call(self);

  self.timer = null;
  self.registeredSensors = [];

  openSerialPort(self, openSerialCallback);
}

util.inherits(Vcek, EventEmitter);

/*
Vcek.prototype.startPolling = function () {
  var self = this;

  if (!self.timer) {
    self.timer = setInterval(function () {
      logger.trace(POLLING_MSG, self.port.isOpen());
      self.port.write(POLLING_MSG);
    }, POLLING_INTERVAL);
  }
};

Vcek.prototype.stopPolling = function () {
  if (this.registeredSensors.length && this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }
};
*/

Vcek.prototype.registerSensor = function (id) {
  this.registeredSensors.push(id);
  this.registeredSensors = _.uniq(this.registeredSensors);
};

Vcek.prototype.deregisterSensor = function (id) {
  _.pull(this.registeredSensors, id);
};

Vcek.prototype.close = function () {
  logger.info('Closing serial port');
  this.port.close();
};

module.exports = new Vcek();
