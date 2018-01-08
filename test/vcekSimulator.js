'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var SerialPort = require('serialport');
var _ = require('lodash');
var async = require('async');
var logger = require('log4js').getLogger('VCEK');

var serialOpts = {
  baudRate: 115200,
  parity: 'none',
  //parser: SerialPort.parsers.byteDelimiter(']'.charCodeAt(0))
};

var SERIAL_PORT_FILE = '/dev/cu.usbserial-A403BAF1';
var POLLING_INTERVAL = 10000;   // 10 secs
//var POLLING_MSG = 'AE999;AED01001;01;T;25.3;0D0A';
//var RECEIVER = 'AE999';
//var SENDER = 'AED01001';
//var SENSOR_ID = '01';
//var SENSOR_TYPE = 'T';
var ELIMINATOR = '0D0A';
var DELIMITER = ';';
//var RETRY_OPEN_INTERVAL = 3000; // 3sec

var devices = [
  {
    receiver: 'AE999',
    sender: 'AE0001',
    sensors: [
      {
        id: '001',
        type: 'T'
      },
      {
        id: '002',
        type: 'H'
      },
      {
        id: '003',
        type: 'N'
      },
      {
        id: '004',
        type: 'D'
      },
      {
        id: '005',
        type: 'L'
      },
      {
        id: '006',
        type: 'W'
      }
    ]
  },
  {
    receiver: 'AE999',
    sender: 'AE0002',
    sensors: [
      {
        id: '001',
        type: 'T'
      },
      {
        id: '002',
        type: 'H'
      },
      {
        id: '003',
        type: 'N'
      },
      {
        id: '004',
        type: 'D'
      },
      {
        id: '005',
        type: 'L'
      },
      {
        id: '006',
        type: 'W'
      }
    ]
  }
];

function isInvalid() {
  return false;
}

function generateValue(receiver, sender, sensorId, sensorType) {
  var tbl = {
    T: {
      min: -20,
      max: 300,
      precision: 10
    },
    H: {
      min: 0,
      max: 100,
      precision: 10
    },
    N: {
      min: 0,
      max: 150,
      precision: 1
    },
    D: {
      min: 0,
      max: 500,
      precision: 10
    },
    L: {
      min: 0,
      max: 150000,
      precision: 1
    },
    W: {
      min: 0,
      max: 1000,
      precision: 10
    }
  };

  var arr = [
    receiver,
    sender,
    sensorId,
    sensorType
  ];

  var min = tbl[sensorType].min;
  var max = tbl[sensorType].max;
  var precision = tbl[sensorType].precision;

  arr.push(Math.round(_.random(min, max, true) * precision) / precision);
  arr.push(ELIMINATOR);
  return arr.join(DELIMITER);
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
      //var values;

      logger.trace('[Vcek] onData():', new Buffer(data).toString());

      if (isInvalid(data)) {
        logger.error('Invalid message:', new Buffer(data).toString());

        return;
      }

      //values = parseMessage(data);
    });

    self.startPolling();
  });
}

function openSerialCallback(/*err*/) {
  /*
  setTimeout(function () {
    openSerialPort(openSerialCallback);
  }, RETRY_OPEN_INTERVAL);
  */
}

// TODO: Find serial port file. ttyUSB0 or ttyS1(E220)
// TODO: If opening port takes long time, async function cannot be finished.
function Vcek () {
  var self = this;

  EventEmitter.call(self);

  self.timer = null;

  openSerialPort(self, openSerialCallback);
}

util.inherits(Vcek, EventEmitter);

Vcek.prototype.startPolling = function () {
  var self = this;

  if (!self.timer) {
    self.timer = setInterval(function () {
      async.eachSeries(devices, function (device, done) {
        async.eachSeries(device.sensors, function (sensor, done2) {
          var msg = generateValue(device.receiver, device.sender, sensor.id, sensor.type);

          logger.info(msg, self.port.isOpen());
          self.port.write(msg, function (err) {
            if (err) {
              logger.error('Write Error:', err);
            } else {
              logger.trace('Write Done');
            }

            self.port.drain(function (err2) {
              if (err2) {
                logger.error('Drain Error:', err2);
              } else {
                logger.trace('Drain Done');
              }

              done2(err);
            });
          });
        }, function (err) {
          done(err);
        });
      });
    }, POLLING_INTERVAL);
  }
};

Vcek.prototype.stopPolling = function () {
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }
};

Vcek.prototype.close = function () {
  logger.info('Closing serial port');
  this.port.close();
};

module.exports = new Vcek();
