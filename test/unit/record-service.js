var q = require('q');
var RecordService = require('../../src/record-service.js');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
chai.use(sinonChai);

describe('RecordService', function() {
  var type = 'Cat';
  var id = '1';
  var data = {
    name: 'Fluffy',
    color: 'grey'
  }
  var mockStorageProvider = {
    save: function() {
      var deferred = q.defer();
      deferred.resolve(id);
      return deferred.promise;
    },
    load: function() {
      var deferred = q.defer();
      deferred.resolve(data);
      return deferred.promise;
    },
    sync: function() {
      var deferred = q.defer();
      deferred.resolve(data);
      return deferred.promise;
    }
  };
  it('should require a provider', function() {
    expect(function() {
      var record = new RecordService();
    }).to.throw();
  });
  it('should require a type', function() {
    expect(function() {
      var record = new RecordService(mockStorageProvider);
    }).to.throw();
  });
  it('should remember the type', function() {
    var record = new RecordService(mockStorageProvider, type);
    expect(record.getType()).to.equal(type);
  });
  it('should save data', function() {
    var record = new RecordService(mockStorageProvider, type);
    var spy = sinon.spy(mockStorageProvider, 'save');
    return record.save()
      .then(function() {
        expect(record.getID()).to.equal(id);
        expect(spy).to.have.been.called;
      });
  });
  it('should reject updates without data', function() {
    var record = new RecordService(mockStorageProvider, type);
    return record.update()
      .catch(function(err) {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal('Data required');
      });
  });
  it('should update the data', function() {
    var record = new RecordService(mockStorageProvider, type);
    var spy = sinon.spy(record, 'save');
    return record.update(data)
      .then(function() {
        expect(spy).to.have.been.called;
      });
  });
  it('should reject updates without data', function() {
    var record = new RecordService(mockStorageProvider, type);
    return record.update()
      .catch(function(err) {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal('Data required');
      });
  });
  it('should update data', function() {
    var record = new RecordService(mockStorageProvider, type);
    var spy = sinon.spy(record, 'save');
    return record.update(data)
      .then(function() {
        expect(spy).to.have.been.called;
      });
  });
  it('should not load a record without an id', function(done) {
    var record = new RecordService(mockStorageProvider, type);
    return record.load().then(function() {}, function(err) {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.equal('Cannot load a record without an id');
      done();
    });
  });
  it('should load data', function() {
    var record = new RecordService(mockStorageProvider, type, id);
    var spy = sinon.spy(record, 'load');
    return record.load()
      .then(function(loadedData) {
        expect(spy).to.have.been.called;
        expect(loadedData.name).to.equal(data.name);
        expect(loadedData.color).to.equal(data.color);
      });
  });
  it('should not sync a record without an id', function() {
    var record = new RecordService(mockStorageProvider, type);
    return record.sync()
      .catch(function(err) {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal('Cannot sync a record without an id');
      });
  });
  it('should sync records', function() {
    var record = new RecordService(mockStorageProvider, type, id);
    var spy = sinon.spy(record, 'sync');
    return record.sync()
      .then(function(syncedData) {
        expect(syncedData).to.equal(data);
        expect(spy).to.have.been.called;
      });
  });
  it('should unsync records', function() {
    var record = new RecordService(mockStorageProvider, type, id);
    var spy = mockStorageProvider.unsync = sinon.spy();
    record.unsync();
    expect(spy).to.have.been.called;
  });
  it('should relate one record to another', function() {
    var record = new RecordService(mockStorageProvider, type, id);
    expect(record.getPerson).to.be.undefined;
    expect(record.setPerson).to.be.undefined;
    record.relateToOne('Person');
    expect(record.getPerson).not.to.be.undefined;
    expect(record.setPerson).not.to.be.undefined;
  });
  it('should relate one record to many others', function() {
    var record = new RecordService(mockStorageProvider, type, id);
    expect(record.getToys).to.be.undefined;
    expect(record.addToy).to.be.undefined;
    record.relateToMany('Toy');
    expect(record.getToys).not.to.be.undefined;
    expect(record.addToy).not.to.be.undefined;
  });
  it('should store and retrive data locally', function() {
    var record = new RecordService(mockStorageProvider, type, id);
    record.setData({
      cat: 'hat',
      oneFish: 'bluefish'
    });
    expect(record.getData().cat).to.equal('hat');
    expect(record.getData().oneFish).to.equal('bluefish');
  })
});