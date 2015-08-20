/*jslint node: true */
"use strict";

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var updateRecordSets = require('./lib/updateRecordSets');

var existsAsync = function (path) {
    return new Promise(function (resolve) {
        return fs.exists(path, function (exists) {
            return resolve(exists);
        });
    });
};

var s3LocationPath = './s3Location.json';
var resourcePath = './resource.json';

exports.handler = function(event, context) {
    return Promise.join(existsAsync(s3LocationPath)
                        , existsAsync(resourcePath)
                        , function (s3LocationExists, resourceExists) {
                            return updateRecordSets({
                                s3Location: s3LocationExists && s3LocationPath
                                , resource: resourceExists && resourcePath
                            });
                        })
        .then(function (data) {
            context.succeed(data);
        })
        .catch(function (err) {
            context.fail('Error: ' + JSON.stringify(err, null, 4) + JSON.stringify(err.stack, null, 4));
        });
};
