#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var pathlib = require('path');
var zip = new require('jszip')();
 
var rootPath = pathlib.join(__dirname, '..');

module.exports = function (params) {
    var zipFile = function (filePath) {
        zip.file(filePath, fs.readFileSync(pathlib.join(rootPath, filePath)));
    };

    var zipDir = function (dirPath) {
        var walkFiles = function (dirPath, cb) {
            // walk files relative to the rootpath
            var absoluteDirPath = pathlib.join(rootPath, dirPath);
            _.each(fs.readdirSync(absoluteDirPath), function (fileName) {
                var relativePath = pathlib.join(dirPath, fileName);
                var absoluteFilePath = pathlib.join(rootPath, relativePath);
                var fileStat = fs.statSync(absoluteFilePath);
                if (fileStat.isDirectory()) {
                    cb(relativePath, true);
                    return walkFiles(relativePath, cb);
                } else {
                    return cb(relativePath, fileStat.isDirectory());            
                }
            });
        };

        walkFiles(dirPath, function (filePath, isDir) {
            if (isDir) {
                zip.folder(filePath);
            } else {
                zipFile(filePath);
            }
        });
    };

    _.each(['node_modules', 'lib'], zipDir);
    _.each(['lambda-index.js'], zipFile);
    
    if (params.s3Location) {
        zip.file('s3Location.json', JSON.stringify(params.s3Location, null, 4));
    }

    if (params.resource) {
        zip.file('resource.json', JSON.stringify(params.resource, null, 4));
    }

    return Promise.resolve(zip.generate({ type: "nodebuffer" }));
};



