var RecordService = require('./record-service.js');
var CollectionService = require('./collection-service.js');
/**
 * A simple ORM for real-time datastores
 * @class StorageService
 * @param {StorageProvider} provider the datastore provider which handles reads and writes
 * @returns {Object}
 */
var StorageService = function (provider) {
  if (!provider) { throw new Error('Provider required.'); }
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
};

module.exports = StorageService;
