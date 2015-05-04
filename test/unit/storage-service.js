var StorageService = require('../../src/storage-service.js');
var RecordService = require('../../src/record-service.js');
var CollectionService = require('../../src/collection-service.js');
var expect = require('chai').expect;

describe('StorageService', function() {
  var mockStorageProvider = {};
  it('should require a provider', function() {
    expect(function () { var storage = new StorageService(); }).to.throw();
  });
  it('should create records', function() {
    var storage = new StorageService(mockStorageProvider);
    var record = storage.createRecord('Cat');
    expect(record).to.be.an.instanceof(RecordService);
    expect(record.getType()).to.equal('Cat');
  });
  it('should create records with ids', function() {
    var storage = new StorageService(mockStorageProvider);
    var record = storage.createRecord('Cat', '1');
    expect(record).to.be.an.instanceof(RecordService);
    expect(record.getType()).to.equal('Cat');
  });
  it('should create collections', function() {
    var storage = new StorageService(mockStorageProvider);
    var collection = storage.createCollection('Cat');
    expect(collection).to.be.an.instanceof(CollectionService);
  });
});
