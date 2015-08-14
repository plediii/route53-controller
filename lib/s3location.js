"use strict";

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

module.exports = {
    read: function (s3locationPath) {
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
