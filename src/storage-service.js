var RecordService = require('./record-service.js');
var CollectionService = require('./collection-service.js');
var q = require('q');
var pluralize = require('pluralize');
var CaseConverter = require('./case-converter.js');
var caseConverter = new CaseConverter();

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
   * Retrieves all the remotely stored records matching the specified search criteria
   * @function fetchCollection
   * @memberOf StorageService
   * @instance
   * @param {string} type the type of records in collection, required
   * @param {string} orderBy the name of the field to order the records by
   *                         and to check the equalTo value against, required if using equalTo
   * @param {string, number, null, or boolean} equalTo the value to compare the field
   *                         specified in orderBy against and only add records that
   *                         have the matching value in the specified field
   * @param {number} limit the maximum number of records to be placed in the collection
   * @return promise resolves with the collection
   */
  this.fetchCollection = function(type, orderBy, equalTo, limit) {
    var deferred = q.defer();
    var self = this;
    _provider.queryOnce(pluralize(caseConverter.toCamelCase(type)), orderBy, equalTo, limit).then(function(data) {
      var collection = self.createCollection(type);
      for (recordID in data) {
        if (!data[recordID].deletedAt) {
          var record = self.createRecord(type, recordID);
          record.setData(data[recordID]);
          collection.addRecord(record);
        }
      }
      deferred.resolve(collection);
    }, function(err) {
      deferred.reject(err);
    });
    return deferred.promise;
  }

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