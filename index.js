/*jslint node: true */
"use strict";

var Promise = require('bluebird');
var fs = require('fs');
var updateRecordSets = require('./lib/updateRecordSets');

var existsAsync = function (path) {
    if (!path || !path.length) {
        return Promise.resolve(false);
    }
    return new Promise(function (resolve) {
        return fs.exists(path, function (exists) {
            return resolve(exists);
        });
    });
};

module.exports = function (AWS, params) {
    var s3LocationPath = params.s3LocationPath;
    var resourcePath = params.resourcePath;
    return Promise.join(existsAsync(s3LocationPath)
                        , existsAsync(resourcePath)
                        , function (s3LocationExists, resourceExists) {
                            return updateRecordSets({
                                s3Location: s3LocationExists && s3LocationPath
                                , resource: resourceExists && resourcePath
                            });
                        });
};
