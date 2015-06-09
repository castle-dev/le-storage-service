var StorageProvider = require('le-storage-provider-firebase');
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

    before(function(done) {
      firebaseRef.set({}, function() {
        var recordToFetch = storage.createRecord('Test Record Type');
        recordToFetch.setData({
          testData: 'testing 123'
        });
        recordToFetch.save().then(function(returnedRecord) {
          recordToFetch_id = returnedRecord.getID();
          done();
        });
      });
    });

    it('should fetch the correct record', function(done) {
      storage.fetchRecord('Test Record Type', recordToFetch_id).then(function(returnedRecord) {
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
      storage.fetchRecord('Test Record Type', 'invalid record id').then(function(returnedRecord) {}, function(err) {
        expect(err).to.exist;
        done();
      });
    });

  });
}

testFetchRecord();
testUpdateRecordWithInvalidData();