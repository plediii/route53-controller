"use strict";

var Promise = require('bluebird');
var AWS = require('./aws');
var fs = Promise.promisifyAll(require('fs'));
var jsonparse = Promise.method(JSON.parse);
var _ = require('lodash');

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
    , parse: function (data) {
        return jsonparse(data)
            .catch(function (err) {
                throw new Error('Failed to parse s3location JSON ' + err.message);
            })
            .then(function (s3location) {
                if (!s3location.hasOwnProperty('Bucket')) {
                    throw new Error('s3location must have Bucket');
                }
                if (!_.isString(s3location.Bucket)) {
                    throw new Error('s3location.Bucket must be a string');
                }
                if (!s3location.hasOwnProperty('Key')) {
                    throw new Error('s3location must have Key');
                }
                if (!_.isString(s3location.Key)) {
                    throw new Error('s3location.Key must be a string');
                }
                return s3location;
            });
    }
    , read: function (s3locationPath) {
        return fs.readFileAsync(s3locationPath)
        .then(s3location.parse);
    }
};
