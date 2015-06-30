var StorageProvider = require('le-storage-provider-firebase');
var q = require('q');
var Firebase = require('firebase');
var firebaseUrl = process.env.FIREBASE_URL;
var firebaseRef = new Firebase(firebaseUrl);
var provider = new StorageProvider(firebaseRef);
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var StorageService = require('../../../src/storage-service.js');
var storage = new StorageService(provider);

function testUpdateRecordWithInvalidData() {
  describe('update record with invalid data::', function() {
    after(function() {
      setTimeout(function() {
        process.exit(0);
      }, 1000);
    });
    this.timeout(10000);
    it('should reject the promise', function() {
      var record = storage.createRecord('TestRecordType');
      var varName;
      var returnedPromise = record.update({
        testRecordKey: varName
      });
      return expect(returnedPromise).to.eventually.be.rejected;
    });
  });
}

function testFetchRecord() {
  describe('fetch record::', function() {

    var recordToFetch_id;
    var deletedRecord_id;
    before(function(done) {
      firebaseRef.set({}, function() {
        var recordToFetch = storage.createRecord('Owner');
        recordToFetch.setData({
          testData: 'testing 123'
        });
        var promises = [];

        var deletedRecord = storage.createRecord('Owner');
        deletedRecord.setData({
          testData: 'this record will be deleted'
        });
        promises.push(deletedRecord.save().then(function(returnedRecord) {
          deletedRecord_id = returnedRecord.getID();
          return returnedRecord.delete();
        }));
        promises.push(recordToFetch.save().then(function(returnedRecord) {
          recordToFetch_id = returnedRecord.getID();
        }));
        q.all(promises).then(function() {
          done();
        }, function(err) {
          console.log(err);
        });
      });
    });

    it('should fetch the correct record', function(done) {
      storage.fetchRecord('Owner', recordToFetch_id).then(function(returnedRecord) {
        returnedRecord.save().then(function() {
          returnedRecord.load().then(function(returnedRecordData) {
            expect(returnedRecordData.testData).to.equal('testing 123');
            done();
          }, function(err) {
            console.log(err);
          });
        }, function(err) {
          console.log(err);
        });
      })
    });

    it('should fail to fetch the non-existent record', function(done) {
      storage.fetchRecord('Owner', 'deleted record id').then(function(returnedRecord) {}, function(err) {
        expect(err).to.exist;
        done();
      });
    });
    it('should fail to fetch the deleted record', function(done) {
      storage.fetchRecord('Owner', deletedRecord_id).then(function(returnedRecord) {}, function(err) {
        expect(err).to.exist;
        done();
      });
    });
  });
}

function testJoin() {
  describe('Join', function() {

    var rootRecordForJoin_id = 'rootRecordForJoin_id';
    var joinedChildRecord1_id = 'joinedChildRecord1_id';
    var joinedChildRecord2_id = 'joinedChildRecord2_id';
    var deletedChildRecord_id = 'deletedChildRecord_id';
    var singleRelationDeleted_id = 'singleRelationDeleted_id';
    var singleRelationExisting_id = 'singleRelationExisting_id';

    before(function(done) {
      firebaseRef.set({}, function() {
        var rootRecordForJoin = storage.createRecord('Parent', rootRecordForJoin_id);
        var rootRecordForJoinData = {};
        rootRecordForJoinData.setField = 'testing 123';
        rootRecordForJoin.setData(rootRecordForJoinData);

        var deletedRecord = storage.createRecord('Child', deletedChildRecord_id);
        var deletedRecordData = {};
        deletedRecordData.someField = 'deleted record data';
        deletedRecordData.deletedAt = new Date();
        deletedRecord.setData(deletedRecordData);

        var joinedChildRecord1 = storage.createRecord('Child', joinedChildRecord1_id);
        var joinedChildRecord1Data = {};
        joinedChildRecord1Data.testField = 'stuff';
        joinedChildRecord1.setData(joinedChildRecord1Data);

        var joinedChildRecord2 = storage.createRecord('Child', joinedChildRecord2_id);
        var joinedChildRecord2Data = {};
        joinedChildRecord2Data.testField = 'stuff';
        joinedChildRecord2.setData(joinedChildRecord2Data);

        var singleRelationDeleted = storage.createRecord('Cat', singleRelationDeleted_id);
        var singleRelationDeletedData = {};
        singleRelationDeletedData.testField = 'deleted stuff';
        singleRelationDeletedData.deletedAt = new Date();
        singleRelationDeleted.setData(singleRelationDeletedData);

        var singleRelationExisting = storage.createRecord('Dog', singleRelationExisting_id);
        var singleRelationExistingData = {};
        singleRelationExistingData.testField = 'stuff';
        singleRelationExisting.setData(singleRelationExistingData);

        rootRecordForJoin.relateToMany('Child');
        rootRecordForJoin.addChild(deletedRecord);
        rootRecordForJoin.addChild(joinedChildRecord1);
        rootRecordForJoin.addChild(joinedChildRecord2);

        rootRecordForJoin.relateToOne('Cat');
        rootRecordForJoin.setCat(singleRelationDeleted);

        rootRecordForJoin.relateToOne('Dog');
        rootRecordForJoin.setDog(singleRelationExisting);

        var promises = [];
        promises.push(rootRecordForJoin.save());
        promises.push(deletedRecord.save());
        promises.push(joinedChildRecord1.save());
        promises.push(joinedChildRecord2.save());
        promises.push(singleRelationDeleted.save());
        promises.push(singleRelationExisting.save());

        q.all(promises).then(function() {
          done();
        }, function(err) {
          console.log(err);
        });
      });
    });

    it('should return the joined data exculding the deleted records', function(done) {
      storage.fetchRecord('Parent', rootRecordForJoin_id).then(function(returnedRecord) {
        returnedRecord.join([{
          type: 'Child',
          many: true
        }, {
          type: 'Cat'
        }, {
          type: 'Dog'
        }]).then(function(data) {
          expect(data.children.length).to.equal(2);
          expect(data.children[0]._id).to.equal(joinedChildRecord1_id);
          expect(data.children[1]._id).to.equal(joinedChildRecord2_id);
          expect(data.dog._id).to.equal(singleRelationExisting_id);
          expect(data.cat).not.to.be.ok;
          done();
        }, function(err) {
          console.log(err);
        });
      })
    });
  });
}

testFetchRecord();
testUpdateRecordWithInvalidData();
testJoin();