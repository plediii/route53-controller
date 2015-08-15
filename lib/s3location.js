"use strict";

var Promise = require('bluebird');
var AWS = require('./aws');
var fs = Promise.promisifyAll(require('fs'));

var s3 = new AWS.S3();

var s3location = module.exports = {
    download: function (s3location) {
        return new Promise(function (resolve, reject) {
            return s3.getObject({
                Bucket: s3location.Bucket
                , Key: s3location.Key
            }, function (err, data) {
                if (err) {
                    return reject(err);
                } else {
                    return resolve(data.Body);
                }
            });
        });
    }
    , read: function (s3locationPath) {
        return fs.readFileAsync(s3locationPath)
            .then(function (data) {
                try {
                    return JSON.parse(data);
                } catch (ex) {
                    throw new Error('Failed to parse JSON ' + s3locationPath + ': ' + ex.message);
                }
            })
            .then(function (s3location) {
                if (!s3location.hasOwnProperty('Bucket')) {
                    throw new Error(s3locationPath + ' is missing Bucket');
                }
                if (!s3location.hasOwnProperty('Key')) {
                    throw new Error(s3locationPath + ' is missing Key');
                }
                return s3location;
            });
    }
};
