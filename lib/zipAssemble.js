"use strict";

var _ = require('lodash');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var pathlib = require('path');


var walkFiles = function (rootPath, dirPath, cb) {
    // walk files relative to the rootpath
    var absoluteDirPath = pathlib.join(rootPath, dirPath);
    _.each(fs.readdirSync(absoluteDirPath), function (fileName) {
        var relativePath = pathlib.join(dirPath, fileName);
        var absoluteFilePath = pathlib.join(rootPath, relativePath);
        var fileStat = fs.statSync(absoluteFilePath);
        if (fileStat.isDirectory()) {
            cb(relativePath, true);
            return walkFiles(rootPath, relativePath, cb);
        } else {
            return cb(relativePath, fileStat.isDirectory());            
        }
    });
};

var zipFile = function (zip, rootPath, filePath) {
    zip.file(filePath, fs.readFileSync(pathlib.join(rootPath, filePath)));
};

var zipDir = function (zip, rootPath, dirPath) {
    zip.folder(dirPath);
    walkFiles(rootPath, dirPath, function (filePath, isDir) {
        if (isDir) {
            zip.folder(filePath);
        } else {
            zipFile(zip, rootPath, filePath);
        }
    });
};


module.exports = function (zip, rootPath, contents) {
    return _.each(contents, function (params) {
        if (params.hasOwnProperty('file')) {
            if (params.hasOwnProperty('data')) {
                zip.file(params.file, params.data);
            } else {
                return zipFile(zip, rootPath, params.file);
            }
        } else if (params.hasOwnProperty('folder')) {
            return zipDir(zip, rootPath, params.folder);
        }
    });
};
