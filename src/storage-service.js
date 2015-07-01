var RecordService = require('./record-service.js');
var CollectionService = require('./collection-service.js');
var q = require('q');
/**
 * A simple ORM for real-time datastores
 * @class StorageService
 * @param {StorageProvider} provider the datastore provider which handles reads and writes
 * @returns {Object}
 */
var StorageService = function(provider) {
  if (!provider) {
    throw new Error('Provider required.');
  }
  var _provider = provider;
  /**
   * Creates a new record object using the RecordService
   * @function createRecord
   * @memberof StorageService
   * @instance
   * @param {string} type the type of record to create
   * @param {string} id (optional) the id of the record
   * @returns {Record}
   */
  this.createRecord = function(type, id) {
    return new RecordService(_provider, type, id);
  };
  /**
   * Creates a new collection object using the CollectionService
   * @function createCollection
   * @memberof StorageService
   * @instance
   * @param {string} type the type of record to create
   * @returns {Collection}
   */
  this.createCollection = function(type) {
    return new CollectionService(_provider, type);
  };

  /**
   * Retrieves a remotely stored record
   * @function fetchRecord
   * @memberof StorageService
   * @instance
   * @param {string} type the type of record to create
   * @param {string} id the id of the record
   * @returns promise resolves with the desired record
   */
  this.fetchRecord = function(type, id) {
    var deferred = q.defer();
    var record = this.createRecord(type, id);
    record.load().then(function(data) {
      record.setData(data);
      deferred.resolve(record);
    }, function(err) {
      deferred.reject(err);
    });
    return deferred.promise;
  }

  /**
   * deletes a remotely stored record
   * @function deleteRecord
   * @memberof StorageService
   * @instance
   * @param {string} type the type of record to delete
   * @param {string} id the id of the record
   * @returns promise resolves with no data
   */
  this.deleteRecord = function(type, id) {
    var deferred = q.defer();
    this.fetchRecord(type, id).then(function(returnedRecord) {
      returnedRecord.delete().then(function() {
        deferred.resolve();
      }, function(err) {
        deferred.reject(err);
      });
    }, function(err) {
      deferred.reject(err);
    });
    return deferred.promise;
  }
};

module.exports = StorageService;