var q = require('q');
var CollectionService = require('../../src/collection-service.js');
var RecordService = require('../../src/record-service.js');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
chai.use(sinonChai);

describe('CollectionService', function () {
  var collection;
  var type = 'Cat';
  var id = '1';
  var data = {
    name: 'Fluffy',
    color: 'grey'
  }
  var collectionData = [];
  collectionData.push(data);
  var mockStorageProvider = {
    load: function () {
      var deferred = q.defer();
      deferred.resolve(data);
      return deferred.promise;
    },
    sync: function () {
      var deferred = q.defer();
      deferred.resolve(data);
      return deferred.promise;
    }
  };
  it('should require a provider', function () {
    expect(function () { new CollectionService(); }).to.throw('Provider required');
  });
  it('should require a type', function () {
    expect(function () { new CollectionService(mockStorageProvider); }).to.throw('Type required');
  });
  it('should allow records to be added', function () {
    collection = new CollectionService(mockStorageProvider, type);
    var record = new RecordService(mockStorageProvider, type, id);
    collection.addRecord(record);
  });
  it('should only accept records from the RecordService', function () {
    expect(function () { new CollectionService(mockStorageProvider, type).addRecord(); }).to.throw('Only records created by the RecordService can be added');
  });
  it('should load records', function () {
    var spy = sinon.spy(collection, 'load');
    return collection.load()
    .then(function (loadedData) {
      expect(spy).to.have.been.called;
      expect(loadedData).to.deep.equal(collectionData);
    });
  });
  it('should sync records', function() {
    var spy = sinon.spy(collection, 'sync');
    return collection.sync()
    .then(function (syncedData) {
      expect(syncedData).to.deep.equal(collectionData);
      expect(spy).to.have.been.called;
    });
  });
  it('should unsync records', function() {
    var spy = mockStorageProvider.unsync = sinon.spy();
    collection.unsync();
    expect(spy).to.have.been.called;
  });
  it('should query records', function() {
    var spy = mockStorageProvider.query = sinon.spy();
    collection.query();
    expect(spy).to.have.been.called;
  });
});
