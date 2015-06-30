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

// function testUpdateRecordWithInvalidData() {
//   describe('update record with invalid data::', function() {
//     after(function() {
//       setTimeout(function() {
//         process.exit(0);
//       }, 1000);
//     });
//     this.timeout(10000);
//     it('should reject the promise', function() {
//       var record = storage.createRecord('TestRecordType');
//       var varName;
//       var returnedPromise = record.update({
//         testRecordKey: varName
//       });
//       return expect(returnedPromise).to.eventually.be.rejected;
//     });
//   });
// }
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

testFetchRecord();
// testUpdateRecordWithInvalidData();