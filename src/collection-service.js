var pluralize = require('pluralize');
var q = require('q');
var CaseConverter = require('./case-converter.js');
var caseConverter = new CaseConverter();

/**
 * A tool for interacting with collections of data
 * @class CollectionService
 * @param {Object} provider the datastore provider which handles reads and writes
 * @param {string} type the type of collection to create
 * @returns {Collection} collection
 */
var CollectionService = function(provider, type) {
  if (!provider) {
    throw new Error('Provider required');
  }
  if (!type) {
    throw new Error('Type required');
  }
  var RecordService = require('./record-service.js'); //required at runtime to avoid circular dependency
  var _provider = provider;
  var _type = caseConverter.toSnakeCase(type);
  var _records = [];
  var _sync;
  /**
   * Adds a record to this collection
   *
   * Will automatically sync the record if the collection is synced.
   * @function addRecord
   * @memberof CollectionService
   * @instance
   */
  this.addRecord = function(record) {
    var collection = this;
    if (!(record instanceof RecordService)) {
      throw new Error('Only records created by the RecordService can be added');
    }
    if (record.getType() !== _type) {
      throw new Error('Type mismatch');
    }
    if (_sync) {
      record.sync(function() {
        collection.load()
          .then(_sync);
      });
    }
    _records.push(record);
  }
  /**
   * Returns this collection's array of records
   *
   * @function getRecords
   * @memberof CollectionService
   * @instance
   * @returns {Array} records
   */
  this.getRecords = function() {
    return _records;
  }
  /**
   * Reads the collection's data from the datastore
   * @function load
   * @memberof CollectionService
   * @instance
   * @returns {Promise} promise resolves with an array of the collection's data
   */
  this.load = function() {
    var promises = [];
    var collectionData = [];
    for (var i = 0; i < _records.length; i++) {
      promises.push(_records[i].load().then(function(recordData) {
        collectionData.push(recordData);
      }));
    }
    return q.allSettled(promises)
      .then(function() {
        return collectionData;
      }, function(err) {
        return collectionData;
      });
  }
  /**
   * Syncs the collection's data from the datastore
   * @function sync
   * @memberof CollectionService
   * @instance
   * @param {Function} onDataChanged the callback that receives updates to the collection's data
   * @returns {Promise} promise resolves with the collection's data
   */
  this.sync = function(onDataChanged) {
    _sync = onDataChanged;
    var collection = this;
    for (var i = 0; i < _records.length; i++) {
      _records[i].sync(function() {
        collection.load()
          .then(onDataChanged);
      });
    }
    return collection.load();
  }
  /**
   * Removes the collection's sync listener
   * @function unsync
   * @memberof CollectionService
   * @instance
   */
  this.unsync = function() {
    for (var i = 0; i < _records.length; i++) {
      _records[i].unsync();
    }
    delete this._sync;
  }
  /**
   * Lookup records in this collection
   * @function query
   * @memberof CollectionService
   * @instance
   * @param {string} sortBy the column name to sort on
   * @param {(string|number)} equalTo the value to filter by
   * @param {number} limit the maximum number of records to find
   */
  this.query = function(sortBy, equalTo, limit) {
    var service = this;
    service._records = [];

    function resultFound(key) {
      var record = new RecordService(_provider, _type, key);
      record.load().then(function() {
        service.addRecord(record);
      })
    }
    var type = pluralize(caseConverter.toCamelCase(_type));
    _provider.query(type, sortBy, equalTo, limit, resultFound);
  },
  /**
   * Associates related data
   *
   * Deep joins can be performed by passing
   * multiple config objects to this function
   * @function join
   * @memberof CollectionService
   * @instance
   * @param {...Object} config a map of properties to join on
   * @param {string} config.type the record type to join by
   * @param {boolean} config.many (optional) join with hasMany relation
   * @param {boolean} config.as (optional) join with named relation
   * @returns {Promise} promise resolves with the combined data object
   */
  this.join = function() {
    var deferred = q.defer();
    var _collection = this;
    var records = _collection.getRecords();
    var promises = [];
    for (var i = 0; i < records.length; i += 1) {
      promises.push(records[i].join.apply(records[i], arguments));
    }
    q.allSettled(promises).then(function(settledPromises) {
      var data = [];
      for (var i = 0; i < settledPromises.length; i++) {
        if (settledPromises[i].state === 'fulfilled') {
          data.push(settledPromises[i].value);
        }
      }
      deferred.resolve(data);
    }, function(err) {
      deferred.reject(err);
    });

    return deferred.promise;
  };
};

module.exports = CollectionService;
