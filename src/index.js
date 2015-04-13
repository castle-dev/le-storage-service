var RecordService = require('./record-service.js');
var CollectionService = require('./collection-service.js');
/**
 * A simple ORM for real-time datastores
 * @module StorageService
 * @param {Object} provider the datastore provider which handles reads and writes
 * @returns {Object} StorageService
 */
var StorageService = function (provider) {
  if (!provider) { throw new Error('Provider required.'); }
  var _provider = provider;
  /**
   * Creates a new record object using the RecordService
   * @param {string} type the type of record to create
   * @param {string} id (optional) the id of the record
   * @returns {Record} record
   */
  this.createRecord = function(type, id) {
    return new RecordService(_provider, type, id);
  };
  /**
   * Creates a new collection object using the CollectionService
   * @param {string} type the type of record to create
   * @returns {Collection} collection
   */
  this.createCollection = function(type) {
    return new CollectionService(_provider, type);
  };
};

module.exports = StorageService;
