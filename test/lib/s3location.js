"use strict";

var test = require('tape');
var m = require('../../lib/s3location');
var _ = require('lodash');
var pathlib = require('path');

test('s3location', function (t) {
    t.test('parse', function (s) {
        s.test('Parses valid s3location.json', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "Bucket": "bucket",
                "Key": "key"
            }))
            .then(function (location) {
                r.ok(location, 'Parsed.');
            });
        });

        s.test('Rejects on invalid json', function (r) {
            r.plan(1);
            m.parse("undefined")
            .catch(function (err) {
                r.ok(err.message.match(/JSON/), 'Reject references JSON');
            });
        });

        s.test('Requires presence of Bucket', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "Key": "key"
            }))
                .catch(function (err) {
                    console.log(err);
                    r.ok(err.message.match(/Bucket/), 'Names missing attribute');
                });
        });

        s.test('Requires bucket to be a string', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "Bucket": []
                , "Key": "key"
            }))
                .catch(function (err) {
                    r.ok(err.message.match(/Bucket/), 'Names broken attribute');
                });
        });

        s.test('Requires presence of Key', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "Bucket": "bucket"
            }))
                .catch(function (err) {
                    r.ok(err.message.match(/Key/), 'Names missing attribute');
                });
        });

        s.test('Requires key to be a string', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "Bucket": "bucket"
                , "Key": []
            }))
                .catch(function (err) {
                    console.log(err);
                    r.ok(err.message.match(/Key/), 'Names missing attribute');
                });
        });
    });

    t.test('read', function (s) {
        s.test('Reads s3location.json', function (r) {
            r.plan(2);
            m.read(pathlib.join(__dirname, '/data/s3location.json'))
            .then(function (location) {
                r.equal(location.Bucket, "foo");
                r.equal(location.Key, "bar");
            });
        });
    });

    t.test('download', function (s) {
        s.test('Downloads resource from s3', function (r) {
            r.plan(2);
            m.download({
                S3: function () {
                    return {
                        getObject: function (location) {
                            r.equal(location.Bucket, 'foo');
                            r.equal(location.Key, 'bar');
                        }
                    };
                }
            }, {
                Bucket: 'foo'
                , Key: 'bar'
            });
        });

        s.test('Resolves to downloaded s3 data', function (r) {
            r.plan(1);
            m.download({
                S3: function () {
                    return {
                        getObject: function (location, cb) {
                            return cb(null, {
                                Body: 'data'
                            });
                        }
                    };
                }
            }, {
                Bucket: 'foo'
                , Key: 'bar'
            })
            .then(function (data) {
                r.equal(data, 'data');
            });
        });

        s.test('Rejects on download error', function (r) {
            r.plan(1);
            m.download({
                S3: function () {
                    return {
                        getObject: function (location, cb) {
                            return cb('err');
                        }
                    };
                }
            }, {
                Bucket: 'foo'
                , Key: 'bar'
            })
            .catch(function (err) {
                r.equal(err, 'err');
            });
        });
    });
});
