var pluralize = require('pluralize');
var q = require('q');
var CollectionService = require('./collection-service.js');

function isDate(object) {
  return Object.prototype.toString.call(object) === '[object Date]'
}

function toSnakeCase(string) {
  var words = string.split(' ');
  var output = '';
  for (var i = 0; i < words.length; i++) {
    output = output + words[i].charAt(0).toUpperCase() + words[i].slice(1);
  }
  return output;
}

function toCamelCase(string) {
  var snakeCase = toSnakeCase(string);
  return snakeCase.charAt(0).toLowerCase() + snakeCase.slice(1);
}

function cloneProperties(obj) {
  if (obj == null || typeof(obj) != 'object' || isDate(obj)) {
    return obj;
  }
  var temp = new obj.constructor();
  for (var key in obj) {
    temp[key] = cloneProperties(obj[key]);
  }
  return temp;
}
/**
 * A tool for interacting with data records
 * @class RecordService
 * @param {Object} provider the datastore provider which handles reads and writes
 * @param {string} type the type of collection to create
 * @param {string} id (optional) the id of the record
 * @returns {Record}
 */
var RecordService = function(provider, type, id) {
  if (!provider) {
    throw new Error('Provider required');
  }
  if (!type) {
    throw new Error('Type required');
  }
  var _provider = provider;
  var _type = toSnakeCase(type);
  var _id = id;
  var _data = {};
  /**
   * Returns this record's type
   * @function getType
   * @memberof RecordService
   * @instance
   * @returns {string}
   */
  this.getType = function() {
    return _type;
  }

  /**
   * Returns this record's type
   * @function getID
   * @memberof RecordService
   * @instance
   * @returns {string}
   */
  this.getID = function() {
    return _id;
  }

  /**
   * Returns this record's data
   * @function getData
   * @memberOf RecordService
   * @instance
   * @return {object}
   */
  this.getData = function() {
    return _data;
  }

  /**
   * Changes the record's data without saving to the datastore
   *
   * Useful for setting data on new records before adding relations
   * @function setData
   * @memberof RecordService
   * @instance
   * @param {Object} data the record's new data
   */
  this.setData = function(data) {
    var _record = this;
    if (!data) {
      return q.reject(new Error('Data required'));
    }
    var createdAt = _data.createdAt;
    _data = data;
    _data.createdAt = createdAt;
    return _record;
  };
  /**
   * Stores this record's data in the datastore
   *
   * Sets lastUpdatedAt on every save and
   * createdAt when saving a new record.
   * @function save
   * @memberof RecordService
   * @instance
   * @returns {Promise}
   */
  this.save = function() {
    var record = this;
    if (!_data.createdAt) { _data.createdAt = new Date(); }
    if (_data._id) { delete _data._id }
    _data.lastUpdatedAt = new Date();
    return _provider.save(pluralize(toCamelCase(_type)), _id, cloneProperties(_data))
      .then(function(id) {
        _id = id;
        return record;
      });
  };
  /**
   * Overwrite the record's data and save in the datastore
   * @function update
   * @memberof RecordService
   * @instance
   * @param {Object} data the record's new data
   * @returns {Promise}
   */
  this.update = function(data) {
    if (!data) {
      return q.reject(new Error('Data required'));
    }
    var createdAt = _data.createdAt;
    _data = data;
    _data.createdAt = createdAt;
    return this.save();
  };
  /**
   * Reads the record's data from the datastore
   * @function load
   * @memberof RecordService
   * @instance
   * @returns {Promise} resolves with the record's data
   */
  this.load = function() {
    var _record = this;
    if (!_id) {
      return q.reject(new Error('Cannot load a record without an id'));
    }
    return _provider.load(pluralize(toCamelCase(_type)), _id)
    .then(function (data) {
      _data = data;
      _data._id = _record.getID();
      return _data;
    });
  };
  /**
   * Syncs the record's data from the datastore
   * @function sync
   * @memberof RecordService
   * @instance
   * @param {Function} onDataChanged the callback that receives updates to the record's data
   * @returns {Promise} resolves with the record's data
   */
  this.sync = function(onDataChanged) {
    if (!_id) {
      return q.reject(new Error('Cannot sync a record without an id'));
    }
    return _provider.sync(pluralize(toCamelCase(_type)), _id, function(data) {
      _data = data;
      onDataChanged(data);
    });
  };
  /**
   * Removes the record's sync listener
   * @function unsync
   * @memberof RecordService
   * @instance
   */
  this.unsync = function() {
    _provider.unsync(pluralize(toCamelCase(_type)), _id);
  }
  /**
   * Gives this record the ability to link and traverse one related object
   *
   * After calling this, the record will have setType(record) and
   * getType() methods. Example: Calling person.relateToOne('Car') will
   * expose setCar(car) and getCar() methods on the person record
   * @function relateToOne
   * @memberof RecordService
   * @instance
   * @param {string} type the type of record this record has one of
   */
  this.relateToOne = function(type) {
    var _record = this;
    this['get' + toSnakeCase(type)] = function() {
      var id = _data[toCamelCase(type) + '_id'];
      if (!id) {
        return;
      }
      var record = new RecordService(_provider, type, id);
      return record;
    };
    this['set' + toSnakeCase(type)] = function(record) {
      var id = record.getID();
      _data[toCamelCase(record.getType()) + '_id'] = id;
      return _record;
    };
  };
  /**
   * Gives this record the ability to link and traverse many related objects
   *
   * After calling this, the record will have addType(record) and
   * getTypes() methods. Example: Calling person.relateToMany('Device') will
   * expose addDevice(device) and getDevices() methods on the person record
   * @function relateToMany
   * @memberof RecordService
   * @instance
   * @param {string} type the type of record this record has many of
   */
  this.relateToMany = function(type) {
    var _record = this;
    var _collection = new CollectionService(_provider, type);
    this['get' + pluralize(toSnakeCase(type))] = function() {
      _collection = new CollectionService(_provider, type);
      if(_data[toCamelCase(type) + '_ids']) {
        var ids = Object.keys(_data[toCamelCase(type) + '_ids']);
        for (var i = 0; i < ids.length; i++) {
          var record = new RecordService(_provider, type, ids[i]);
          _collection.addRecord(record);
        }
      }
      return _collection;
    };
    this['add' + toSnakeCase(type)] = function(record) {
      var id = record.getID();
      var ids = _data[toCamelCase(record.getType()) + '_ids'];
      if (!ids) {
        _data[toCamelCase(record.getType()) + '_ids'] = {};
      }
      _data[toCamelCase(record.getType()) + '_ids'][id] = true;
      return _record;
    };
  };
  /**
   * Associates related data
   *
   * Deep joins can be performed by passing
   * multiple config objects to this function
   * @function join
   * @memberof RecordService
   * @instance
   * @param {...(Object|Array)} config a map of properties to join on
   * @param {string} config.type the record type to join by
   * @param {boolean} config.many (optional) join with hasMany relation
   * @returns {Promise} promise resolves with the combined data object
   */
  this.join = function() {
    var _record = this;
    var args = [].slice.call(arguments);
    var deferred = q.defer();
    var joinConfigs = args.shift();
    if (!Array.isArray(joinConfigs)) {
      var array = [];
      array.push(joinConfigs);
      joinConfigs = array;
    }
    _record.load()
      .then(function(data) {
        var promises = [];
        for (var i = 0; i < joinConfigs.length; i += 1) {
          (function(type, many) {
            var relation;
            if (many) {
              _record.relateToMany(type);
              relation = eval('_record.get' + pluralize(toSnakeCase(type)) + '()');
            } else {
              _record.relateToOne(type);
              relation = eval('_record.get' + toSnakeCase(type) + '()');
            }
            if (relation) {
              var promise;
              if (args.length === 0) {
                promise = relation.load();
              } else {
                promise = relation.join.apply(relation, args);
              }
              promise
                .then(function(relatedData) {
                  var key = many ? pluralize(toCamelCase(type)) : toCamelCase(type);
                  data[key] = relatedData;
                });
              promises.push(promise);
            }
          })(joinConfigs[i].type, joinConfigs[i].many);
        }
        return q.all(promises)
          .then(function() {
            return data;
          });
      })
      .then(function(joinedData) {
        if (!joinedData) {
          deferred.reject();
        }
        deferred.resolve(joinedData);
      });
    return deferred.promise;
  };
};

module.exports = RecordService;
