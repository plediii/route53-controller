"use strict";

var test = require('tape');
var m = require('../lib/resourceDefinition');
var _ = require('lodash');

test('resourceDefinition', function (t) {
    t.test('parse', function (s) {
        s.test('Parses valid resource.json', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "HostedZone": "Z148QEXAMPLE8V",
                "Resources": {
                }
            }))
            .then(function (resource) {
                r.ok(resource, 'Parsed.');
            });
        });

        s.test('Rejects on invalid json', function (r) {
            r.plan(1);
            m.parse("undefined")
            .catch(function (err) {
                r.ok(err.message.match(/JSON/), 'Reject references JSON');
            });
        });

        s.test('Requires presence of HostedZone', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "Resources": {
                }
            }))
                .catch(function (err) {
                    r.ok(err.message.match(/HostedZone/), 'Names missing attribute');
                });
        });

        s.test('Requires HostedZone to be a string', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "HostedZone": ["Z148QEXAMPLE8V"]
                , "Resources": {
                }
            }))
            .catch(function (err) {
                r.ok(err.message.match(/HostedZone/), 'Names Invalid attribute');
            });
        });

        s.test('Requires presence of Resources', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "HostedZone": "Z148QEXAMPLE8V"
            }))
            .catch(function (err) {
                r.ok(err.message.match(/Resources/), 'Names missing attribute');
            });
        });

        s.test('Requires Resources to be an object', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "HostedZone": "Z148QEXAMPLE8V"
                , "Resources": null
            }))
            .catch(function (err) {
                r.ok(err.message.match(/Resources/), 'Names invalid attribute');
            });
        });

        s.test('Parses valid resource', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "HostedZone": "Z148QEXAMPLE8V"
                , "Resources": {
                    "launch": {
                        "Instances": [
                            {
                                "Region": "us-west-1",
                                "Filters": [
                                    {
                                        "Name": "tag:Name",
                                        "Values": [ "net.route53.launch" ]
                                    }
                                ]
                            }
                        ],
                        "ResourceRecordSet": { 
                            "Name": "launch.route53.net",
                        }
                    }
                }
            }))
            .then(function (resource) {
                r.ok(resource, 'Parsed.');
            });
        });

        s.test('Parses valid resource', function (r) {
            r.plan(1);
            m.parse(JSON.stringify({
                "HostedZone": "Z148QEXAMPLE8V"
                , "Resources": {
                    "launch": {
                        "Instances": [
                            {
                                "Region": "us-west-1",
                                "Filters": [
                                    {
                                        "Name": "tag:Name",
                                        "Values": [ "net.route53.launch" ]
                                    }
                                ]
                            }
                        ],
                        "ResourceRecordSet": { 
                            "Name": "launch.route53.net",
                        }
                    }
                }
            }))
            .then(function (resource) {
                r.ok(resource, 'Parsed.');
            });
        });

        s.test('Requires each resource to have Instances', function (r) {
            r.plan(2);
            m.parse(JSON.stringify({
                "HostedZone": "Z148QEXAMPLE8V"
                , "Resources": {
                    "launch": {
                        "ResourceRecordSet": { 
                            "Name": "launch.route53.net",
                        }
                    }
                }
            }))
            .catch(function (err) {
                r.ok(err.message.match(/Instances/), 'Names problematic attribute');
                r.ok(err.message.match(/launch/), 'Names problematic resource');
            });
        });

        s.test('Requires each Instance to have filters', function (r) {
            r.plan(2);
            m.parse(JSON.stringify({
                "HostedZone": "Z148QEXAMPLE8V"
                , "Resources": {
                    "launch": {
                        "Instances": [
                            {
                                "Region": "us-west-1",
                            }
                        ],
                        "ResourceRecordSet": { 
                            "Name": "launch.route53.net",
                        }
                    }
                }
            }))
                .catch(function (err) {
                    r.ok(err.message.match(/Filters/), 'Names problematic attribute');
                    r.ok(err.message.match(/launch/), 'Names problematic resource');
                });
        });

        s.test('Requires ResourceRecordSet', function (r) {
            r.plan(2);
            m.parse(JSON.stringify({
                "HostedZone": "Z148QEXAMPLE8V"
                , "Resources": {
                    "launch": {
                        "Instances": [
                            {
                                "Region": "us-west-1",
                            }
                        ]
                    }
                }
            }))
                .catch(function (err) {
                    r.ok(err.message.match(/ResourceRecordSet/), 'Names problematic attribute');
                    r.ok(err.message.match(/launch/), 'Names problematic resource');
                });
        });

        s.test('Requires ResourceRecordSet to have a Name', function (r) {
            r.plan(3);
            m.parse(JSON.stringify({
                "HostedZone": "Z148QEXAMPLE8V"
                , "Resources": {
                    "launch": {
                        "Instances": [
                            {
                                "Region": "us-west-1",
                            }
                        ]
                        , "ResourceRecordSet": { 
                            "Type": "A"
                        }
                    }
                }
            }))
                .catch(function (err) {
                    r.ok(err.message.match(/ResourceRecordSet/), 'Names problematic attribute');
                    r.ok(err.message.match(/Name/), 'Names missing attribute attribute');
                    r.ok(err.message.match(/launch/), 'Names problematic resource');
                });
        });
    });
});
