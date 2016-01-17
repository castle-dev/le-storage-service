var pluralize = require('pluralize');
var q = require('q');
var CollectionService = require('./collection-service.js');
var CaseConverter = require('./case-converter.js');
var caseConverter = new CaseConverter();

/**
 * A tool for interacting with data records
 * @class RecordService
 * @param {Object} provider the datastore provider which handles reads and writes
 * @param {string} type the type of collection to create
 * @param {string} id (optional) the id of the record
 * @returns {Record}
 */
var RecordService = function(provider, type, id) {

  /**
   * Deletes the record
   * @function delete
   * @memberof RecordService
   * @instance
   * @returns {Promise} resolves with no data
   */
  this.delete = deleteRecord;

  /**
   * Returns this record's locally stored data
   * @function getData
   * @memberOf RecordService
   * @instance
   * @return {object}
   */
  this.getData = getData;

  /**
   * Returns this record's ID
   * @function getID
   * @memberof RecordService
   * @instance
   * @returns {string}
   */
  this.getID = getID;

  /**
   * Returns this record's type
   * @function getType
   * @memberof RecordService
   * @instance
   * @returns {string}
   */
  this.getType = getType;

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
   * @param {boolean} config.as (optional) join with named relation
   * @returns {Promise} promise resolves with the combined data object
   */
  this.join = join;

  /**
   * Reads the record's data from the datastore
   * @function load
   * @memberof RecordService
   * @instance
   * @returns {Promise} resolves with the record's data
   */
  this.load = load;

  /**
   * Gives this record the ability to link and traverse many related objects
   *
   * After calling this, the record will have addType(record) and
   * getTypes() methods. Example: Calling person.relateToMany('Device') will
   * expose addDevice(device) and getDevices() methods on the person record
   *
   * Note: the getTypes method is deprecated, please prefer the join method
   * @function relateToMany
   * @memberof RecordService
   * @instance
   * @param {string} type the type of record this record has many of
   * @param {string} as (optional) the name of the relation
   */
  this.relateToMany = relateToMany;

  /**
   * Gives this record the ability to link and traverse one related object
   *
   * After calling this, the record will have setType(record) and
   * getType() methods. Example: Calling person.relateToOne('Car') will
   * expose setCar(car) and getCar() methods on the person record
   *
   * Note: the getType method is deprecated, please prefer the join method
   * @function relateToOne
   * @memberof RecordService
   * @instance
   * @param {string} type the type of record this record has one of
   * @param {string} as (optional) the name of the relation
   */
  this.relateToOne = relateToOne;

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
  this.save = save;

  /**
   * Changes the record's data without saving to the datastore
   *
   * Useful for setting data on new records before adding relations
   * @function setData
   * @memberof RecordService
   * @instance
   * @param {Object} data the record's new data
   */
  this.setData = setData;

  /**
   * Syncs the record's data from the datastore
   * @function sync
   * @memberof RecordService
   * @instance
   * @param {Function} onDataChanged the callback that receives updates to the record's data
   * @returns {Promise} resolves with the record's data
   */
  this.sync = sync;

  /**
   * Removes the record's sync listener
   * @function unsync
   * @memberof RecordService
   * @instance
   */
  this.unsync = unsync;

  /**
   * Overwrite the record's data and save in the datastore
   * @function update
   * @memberof RecordService
   * @instance
   * @param {Object} data the record's new data
   * @returns {Promise}
   */
  this.update = update;

  if (!provider) {
    throw new Error('Provider required');
  }
  if (!type) {
    throw new Error('Type required');
  }
  var _provider = provider;
  var _type = caseConverter.toSnakeCase(type);
  var _id = id;
  var _data = {};

  var deletedRecordMessage = 'The record has been deleted';

  function getType() {
    return _type;
  }

  function getID() {
    return _id;
  }

  function getData() {
    return _data;
  }

  function setData(data) {
    var _record = this;
    if (!data) {
      return q.reject(new Error('Data required'));
    }
    var createdAt = _data.createdAt;
    _data = data;
    _data.createdAt = createdAt;
    return _record;
  };

  function save() {
    var record = this;
    if (_data._id) {
      delete _data._id
    }
    _data.lastUpdatedAt = new Date();
    var dataKey;
    for (dataKey in _data) {
      if (typeof _data[dataKey] == 'undefined') {
        delete _data[dataKey];
      }
    }
    return setCreatedAtOnData().then(function() {
      return _provider.save(pluralize(caseConverter.toCamelCase(_type)), _id, cloneProperties(_data))
        .then(function(id) {
          _id = id;
          return record;
        });
    });
  };

  function setCreatedAtOnData() {
    if (_id) {
      return _provider.load(pluralize(caseConverter.toCamelCase(_type)), _id)
        .then(function(data) {
          if (!data) {
            _data.createdAt = new Date();
          } else if (data.createdAt) {
            _data.createdAt = data.createdAt;
          }
        }, function(err) {
          console.log(err);
          if (!_data.createdAt) {
            _data.createdAt = new Date();
          }
        });
    } else {
      _data.createdAt = new Date();
      return q.resolve();
    }
  }

  function update(data) {
    if (!data) {
      return q.reject(new Error('Data required'));
    }
    var createdAt = _data.createdAt;
    _data = data;
    _data.createdAt = createdAt;
    return this.save();
  };

  function load() {
    var deferred = q.defer();
    var _record = this;
    if (!_id) {
      deferred.reject(new Error('Cannot load a record without an id'));
    }
    _provider.load(pluralize(caseConverter.toCamelCase(_type)), _id)
      .then(function(data) {
        if (!data) {
          deferred.reject(new Error('Specified record does not exist remotely: ' + _type + ' ' + _id));
          return;
        }
        if (data.deletedAt) {
          deferred.reject(new Error(deletedRecordMessage));
          return;
        }
        _data = data;
        _data._id = _record.getID();
        deferred.resolve(_data);
      }, function(err) {
        deferred.reject(err);
      });
    return deferred.promise;
  };

  function deleteRecord() {
    var record = this;
    var collection = pluralize(caseConverter.toCamelCase(_type));
    return record.load()
    .then(function (data) {
      data.deletedAt = new Date();
      return record.update(data);
    })
    .then(function () {
      return _provider.archive(collection, _id);
    });
  }

  function sync(onDataChanged) {
    if (!_id) {
      return q.reject(new Error('Cannot sync a record without an id'));
    }
    return _provider.sync(pluralize(caseConverter.toCamelCase(_type)), _id, function(data) {
      _data = data;
      onDataChanged(data);
    });
  };

  function unsync() {
    _provider.unsync(pluralize(caseConverter.toCamelCase(_type)), _id);
  }

  function relateToOne(type, as) {
    var _record = this;
    if (as) {
      this['get' + caseConverter.toSnakeCase(as)] = function(isPrivate) {
        if (!isPrivate) {
          console.warn('DEPRECATED. Please prefer the join method for fetching related data');
        }
        var id = _data[caseConverter.toCamelCase(as)];
        if (!id) {
          return;
        }
        var record = new RecordService(_provider, type, id);
        return record;
      };
      this['set' + caseConverter.toSnakeCase(as)] = function(record) {
        if (record.getType() !== type) {
          throw new Error('Invalid type. Expecting "' + type + '", but saw "' + record.getType() + '"');
        }
        var id = record.getID();
        _data[caseConverter.toCamelCase(as)] = id;
        return _record;
      };
    } else {
      this['get' + caseConverter.toSnakeCase(type)] = function(isPrivate) {
        if (!isPrivate) {
          console.warn('DEPRECATED. Please prefect the join method for fetching related data');
        }
        var id = _data[caseConverter.toCamelCase(type) + '_id'];
        if (!id) {
          return;
        }
        var record = new RecordService(_provider, type, id);
        return record;
      };
      this['set' + caseConverter.toSnakeCase(type)] = function(record) {
        var id = record.getID();
        _data[caseConverter.toCamelCase(record.getType()) + '_id'] = id;
        return _record;
      };
    }
  };

  function relateToMany(type, as) {
    var _record = this;
    var _collection;
    if (as) {
      this['get' + pluralize(caseConverter.toSnakeCase(as))] = function(isPrivate) {
        if (!isPrivate) {
          console.warn('DEPRECATED. Please prefer the join method for fetching related data');
        }
        _collection = new CollectionService(_provider, type);
        if (_data[pluralize(caseConverter.toCamelCase(as))]) {
          var ids = Object.keys(_data[pluralize(caseConverter.toCamelCase(as))]);
          for (var i = 0; i < ids.length; i++) {
            var record = new RecordService(_provider, type, ids[i]);
            _collection.addRecord(record);
          }
        }
        return _collection;
      };
      this['add' + caseConverter.toSnakeCase(as)] = function(record) {
        if (record.getType() !== type) {
          throw new Error('Invalid type. Expecting "' + type + '", but saw "' + record.getType() + '"');
        }
        var id = record.getID();
        var ids = _data[pluralize(caseConverter.toCamelCase(as))];
        if (!ids) {
          _data[pluralize(caseConverter.toCamelCase(as))] = {};
        }
        _data[pluralize(caseConverter.toCamelCase(as))][id] = true;
        return _record;
      };
      this['remove' + caseConverter.toSnakeCase(as)] = function(record) {
        if (record.getType() !== type) {
          throw new Error('Invalid type. Expecting "' + type + '", but saw "' + record.getType() + '"');
        }
        var id = record.getID();
        if (_data[pluralize(caseConverter.toCamelCase(as))]) {
          delete _data[pluralize(caseConverter.toCamelCase(as))][id];
        }
        return _record;
      };
    } else {
      this['get' + pluralize(caseConverter.toSnakeCase(type))] = function(isPrivate) {
        if (!isPrivate) {
          console.warn('DEPRECATED. Please prefer the join method for fetching related data');
        }
        _collection = new CollectionService(_provider, type);
        if (_data[caseConverter.toCamelCase(type) + '_ids']) {
          var ids = Object.keys(_data[caseConverter.toCamelCase(type) + '_ids']);
          for (var i = 0; i < ids.length; i++) {
            var record = new RecordService(_provider, type, ids[i]);
            _collection.addRecord(record);
          }
        }
        return _collection;
      };
      this['add' + caseConverter.toSnakeCase(type)] = function(record) {
        var id = record.getID();
        var ids = _data[caseConverter.toCamelCase(record.getType()) + '_ids'];
        if (!ids) {
          _data[caseConverter.toCamelCase(record.getType()) + '_ids'] = {};
        }
        _data[caseConverter.toCamelCase(record.getType()) + '_ids'][id] = true;
        return _record;
      };
      this['remove' + caseConverter.toSnakeCase(type)] = function(record) {
        var id = record.getID();
        delete _data[caseConverter.toCamelCase(record.getType()) + '_ids'][id];
        return _record;
      };
    }
  };

  function join() {
    var _record = this;
    var args = [].slice.call(arguments);
    var deferred = q.defer();
    var joinConfigs = args.shift();
    if (!Array.isArray(joinConfigs) && joinConfigs) {
      var array = [];
      array.push(joinConfigs);
      joinConfigs = array;
    }
    _record.load()
      .then(function(data) {
        var promises = [];
        if (joinConfigs) {
          for (var i = 0; i < joinConfigs.length; i += 1) {
            (function(type, many, as) {
              var relation;
              if (many) {
                if (as) {
                  _record.relateToMany(type, as);
                  relation = eval('_record.get' + pluralize(caseConverter.toSnakeCase(as)) + '(true)');
                } else {
                  _record.relateToMany(type);
                  relation = eval('_record.get' + pluralize(caseConverter.toSnakeCase(type)) + '(true)');
                }
              } else {
                if (as) {
                  _record.relateToOne(type, as);
                  relation = eval('_record.get' + caseConverter.toSnakeCase(as) + '(true)');
                } else {
                  _record.relateToOne(type);
                  relation = eval('_record.get' + caseConverter.toSnakeCase(type) + '(true)');
                }
              }
              if (relation) {
                var promise;
                if (args.length === 0) {
                  var loadDeferred = q.defer();
                  relation.load().then(function(data) {
                    loadDeferred.resolve(data);
                  }, function(err) {
                    if (err.message === deletedRecordMessage) {
                      loadDeferred.resolve();
                    } else {
                      loadDeferred.reject(err);
                    }
                  });
                  promise = loadDeferred.promise;
                } else {
                  promise = relation.join.apply(relation, args);
                }
                promise
                  .then(function(relatedData) {
                    if (relatedData) {
                      if (as) {
                        var key = many ? pluralize(caseConverter.toCamelCase(as)) : caseConverter.toCamelCase(as);
                      } else {
                        var key = many ? pluralize(caseConverter.toCamelCase(type)) : caseConverter.toCamelCase(type);
                      }
                      data[key] = relatedData;
                    }
                  });
                promises.push(promise);
              }
            })(joinConfigs[i].type, joinConfigs[i].many, joinConfigs[i].as);
          }
        }
        return q.allSettled(promises)
          .then(function() {
            return data;
          }, function(err) {
            deferred.reject(err);
          });
      }, function(err) {
        deferred.reject(err);
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

function isDate(object) {
  return Object.prototype.toString.call(object) === '[object Date]'
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

module.exports = RecordService;
