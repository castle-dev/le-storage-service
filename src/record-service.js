var pluralize = require('pluralize');
var CollectionService = require('./collection-service.js');
function isDate (object) {
  return Object.prototype.toString.call(object) === '[object Date]'
}
function toSnakeCase (string) {
  var words = string.split(' ');
  var output = '';
  for (var i = 0; i < words.length; i++) {
    output = output + words[i].charAt(0).toUpperCase() + words[i].slice(1);
  }
  return output;
}
function toCamelCase (string) {
  var snakeCase = toSnakeCase(string);
  return snakeCase.charAt(0).toLowerCase() + snakeCase.slice(1);
}
function cloneProperties (obj) {
  if (obj == null || typeof(obj) != 'object' || isDate(obj)) { return obj; }
  var temp = new obj.constructor();
  for(var key in obj) {
    temp[key] = cloneProperties(obj[key]);
  }
  return temp;
}
/**
 * A tool for interacting with data records
 * @module RecordService
 * @param {Object} provider the datastore provider which handles reads and writes
 * @param {string} type the type of collection to create
 * @param {string} id (optional) the id of the record
 * @returns {Record} record
 */
var RecordService = function (provider, type, id) {
  if (!provider) { throw new Error('Provider required'); }
  if (!type) { throw new Error('Type required'); }
  var _provider = provider;
  var _type = toSnakeCase(type);
  var _id = id;
  var _data = {};
  /**
   * Returns this record's type
   * @returns {string} type
   */
  this.getType = function () { return _type; }
  /**
   * Returns this record's id
   * @returns {string} id
   */
  this.getID = function () { return _id; }
  /**
   * Stores this record's data in the datastore
   *
   * Sets lastUpdatedAt on every save and
   * createdAt when saving a new record.
   * @returns {Promise}
   */
  this.save = function () {
    if (!_id) { _data.createdAt = new Date(); }
    _data.lastUpdatedAt = new Date();
    return _provider.save(pluralize(toCamelCase(_type)), _id, cloneProperties(_data))
    .then(function (id) {
      _id = id;
    });
  };
  /**
   * Overwrite the record's data and save in the datastore
   * @param {Object} data the record's new data
   * @returns {Promise}
   */
  this.update = function (data) {
    var createdAt = _data.createdAt;
    _data = data;
    _data.createdAt = createdAt;
    return this.save();
  };
  /**
   * Reads the record's data from the datastore
   * @returns {Promise} promise resolves with the records data
   */
  this.load = function () {
    if (!_id) { throw new Error('Cannot load a record without an id'); }
    return _provider.load(pluralize(toCamelCase(_type)), _id)
    .then(function (data) {
     return _data = data;
    });
  };
  /**
   * Syncs the record's data from the datastore
   * @param {Function} onDataChanged the callback that receives updates to the record's data
   * @returns {Promise} promise resolves with the record's data
   */
  this.sync = function (onDataChanged) {
    if (!_id) { throw new Error('Cannot sync a record without an id'); }
    return _provider.sync(pluralize(toCamelCase(_type)), _id, function (data) {
      _data = data;
      onDataChanged(data);
    });
  };
  /**
   * Removes the record's sync listener
   */
  this.unsync = function () {
    _provider.unsync(pluralize(toCamelCase(_type)), _id);
  }
  /**
   * Gives this record the ability to link and traverse one related object
   *
   * After calling this, the record will have hasType(record) and
   * getType() methods. Example: Calling person.hasOne('Car') will
   * expose hasCar(car) and getCar() methods on the person record
   * @param {string} type the type of record this record has one of
   */
  this.hasOne = function (type) {
    var service = this;
    this['get' + toSnakeCase(type)] = function () {
      var id = _data[toCamelCase(type) + '_id'];
      var record = new RecordService(_provider, type, id);
      return record;
    }
    this['has' + toSnakeCase(type)] = function (record) {
      var id = record.getID();
      _data[toCamelCase(record.getType()) + '_id'] = id;
      return service.save();
    }
  };
  /**
   * Gives this record the ability to link and traverse many related objects
   *
   * After calling this, the record will have hasType(record) and
   * getTypes() methods. Example: Calling person.hasMany('Device') will
   * expose hasDevice(device) and getDevices() methods on the person record
   * @param {string} type the type of record this record has one of
   */
  this.hasMany = function (type) {
    var _service = this;
    var _collection = new CollectionService(_provider, type);
    this['get' + pluralize(toSnakeCase(type))] = function () {
      _collection = new CollectionService(_provider, type);
      var ids = _data[toCamelCase(type) + '_ids'];
      for (var i = 0; i < ids.length; i++) {
        var record = new RecordService(_provider, type, ids[i]);
        _collection.addRecord(record);
      }
      return _collection;
    }
    this['has' + toSnakeCase(type)] = function (record) {
      var id = record.getID();
      var ids = _data[toCamelCase(record.getType()) + '_ids'];
      if(!ids || !ids.length) {
        _data[toCamelCase(record.getType()) + '_ids'] = [];
      }
      _data[toCamelCase(record.getType()) + '_ids'].push(id);
      var record = new RecordService(_provider, type, id);
      _collection.addRecord(record);
      return _service.save();
    }
  };
};

module.exports = RecordService;