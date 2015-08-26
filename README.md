# route53-controller

When launching new EC2 instances in AWS, it is often desirable to add
the new instance's IP to a route53 record set.  For instance when an
autoscaling group launches a new node, AWS provides facilities to
automatically add the instances to a load balancer, but there are no
facilities to automatically add the new instance to a route53 record
set. 

`route53-controller` provides scripts to set up an AWS Lambda function
which will update route53 record sets.  The user provides pairs of
`ec2.describeInstances` Filters and associated
`route53.changeResourceRecordSets` ResourceRecordSets.  When the
lambda function is executed, the IPs of the instances matching the
filters are added to the record set.


An alternative to `route53-controller` would be to include a script in
 the image or user data which will modify the record set when the new
 instance boots.  `route53-controller` can itself run as a standalone
 script (see `./bin/update.js`), however doing so requires including
 permissions to modify route53 record sets for the entire instance.
 By moving the record set modification to an AWS Lambda function, only
 this restricted piece of code requires the permission to modify
 record sets.


## Resource description: *resource.json* 

The instance filters and resource record set pairs are described by a JSON blob, referred to as *resource.json*.  

Note that given a `resource.json` we may immediately update our resource record
sets. It is not necessary to upload a Lambda function.   `route53-controller` includes a command line script in `./bin/update.js` which will perform the update.

```
$ node bin/update.js --resource resource.json
```

The root structure of the *resource.json* is 
```javascript
{
    "HostedZone": "Z148QEXAMPLE8V",
    "Resources": {
        /* Logical IDs of (Instance -> record set) pairs */
    }
 }
```

#### **HostedZone**

This must be the ID of a pre-existing route53 Hosted Zone.  There may be only *HostedZone* one per *resource.json*.  If multiple *HostedZone*s must be controlled, you will need to create additional *route53-controller* Lambda functions.

#### **Resources**

The *Resources* attribute is a list of all the record sets which will be modified along with the filters describing the instances whose IPs will be associated to the record set.  There may be one or more instances/record set pairs.  The format of the *Resources* is
```javascript
"Resources": {
   "ResourceID": {
      "ResourceRecordSet": {  
         /* Description of the Route53 resource record set update */
      },
      "Instances": [
         /* One or more EC2 instance descriptions to be associated to the route53 record set */
      ]
      
   }
}
```

The **ResourceID** of the instances/record set pairs is used to *name* the pair for convenience and in reporting syntax errors, but will not affect the logical operation of record set update.  Any valid JSON attribute name is acceptable.


##### ResourceRecordSet

The **ResourceRecordSet** describes the Resource Record to be updated.  This object will used directly in a
**route53.changeResourceRecordSets** operation, except that the *ResourceRecords* (this list of instance IPs) will be filled in by *route53-controller*.  As such, *route53-controller* *requires* that the **Name** and **Type** attributes be present in *resource.json*.  See the  [changeResourceRecordSets API
documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Route53.html#changeResourceRecordSets-property) for more information about possible attributes.

The basic required format is
```javascript
"ResourceRecordSet": {
    "Name": "bar.example.com", // domain name to be modified
    "Type": "A"                // type of the resource
 }
```

##### Instances

The instances attribute is an array of descipriptions of EC2 instance IPs to be associated with the *ResourceRecordSet*.  The format is 
```javascript
"Instances": [
   /* one ore more instance descriptions */
   {
      "Filters": [
         // One or more ec2.describeInstances filters
      ],
      "PrivateIP": true || false, // Optional: whether to use the instance's private IP
      "Region": "us-east-1" || "us-west-2" || "eu-central-1" || etc. // the AWS Region in which to find the instances
   }
 ]
```

By default, the *public IP* of  each EC2 instance will be inserted into the record set.  However, if the **PrivateIP** attribute is present and `true`, then the *private IPs* will be used instead. 

The **Region** attribute specifies the AWS region in which to find the instances. Only *one* region may be specified per *instance description*.  If the record set must include IPs of instances from different regions, then *multiple* instance descriptions must be used.

The **Filters** attribute is an array of descriptions of which EC2 instances will be included in the new value of the route53 record set.  The filters will be used directly in an `ec2.describeInstances` operation without modification.  See the [describeInstances API
documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-property)
for information and examples of possible filters.  

### Example *resources.json*

A complete mock example of a *resource.json* is
```javascript
{
    "HostedZone": "Z148QEXAMPLE8V",
    "Resources": {
        "bar.example": {
            "Instances": [
                {
                    "Region": "us-west-1",
                    "PrivateIP": true,
                    "Filters": [
                        {
                            "Name": "tag:Name",
                            "Values": [
                                "bar.example"
                            ]
                        }
                    ]
                }
            ],
            "ResourceRecordSet": {
                "Name": "bar.example.com",
                "Type": "A",
                "TTL": 30
            }
        }
    },
    "foo.example": {
        "Instances": [
            {
                "Region": "us-west-2",
                "Filters": [
                    {
                        "Name": "tag:Name",
                        "Values": [
                            "foo.example"
                        ]
                    }
                ]
            },
            {
                "Region": "us-east-1",
                "Filters": [
                    {
                        "Name": "tag:Name",
                        "Values": [
                            "foo.example"
                        ]
                    }
                ]
            }
        ],
        "ResourceRecordSet": {
            "Name": "foo.example.com",
            "Type": "A",
            "TTL": 30
        }
    }
}
```

Here, the *resource.json* file describes modifying the recordset in
a fake example HostedZone.  

* All instances tagged with the `Name` of `bar.example` in the `us-west-1` region are included as IPs in the record set `bar.example.com`.  
* All instances tagged with the `Name` of `foo.example` in the `us-west-2` and `us-east-1` regions are included as IPs in the record set `foo.example.com`.

## IAM policies

Whether the resource record set update is performed at the command
line or by a lambda process, we require appropriate IAM permissions to
describe the EC2 instances and update the record sets.  

The script `./bin/create-policy.js` can create the necessary policy.
It requires at least a local copy of the `resource.json` file, where
it will prefer to read the HostedZone attribute.  Or, if a local copy
is not available, an `s3location.json` file to describe where to fetch
the `resource.json`. 

Alternatively, it can create a policy which may be attached to roles
or users by including the `--createPolicy` option:

```
$ node bin/create-policy.js --resource resource.json --createPolicy route53-controller
```

`./bin/create-policy.js` may also attach the policy inline to an
existing user or role by providing the `--userPolicy` or
`--rolePolicy` respectively.

```
$ node bin/create-policy.js --resource resource.json --rolePolicy lambda_role
```

If an `s3location.json` file is provided, the policy will include read
access to that s3 location.
```
$ node bin/create-policy.js --resource resource.json --s3location s3location.json
```


## Creating a lambda deployment

`route53-controller` will create an AWS Lambda deployment file
including a provided `resource.json` ready to be deployed to AWS
lambda.  Follow, for example, the [AWS Lambda
walkthrough](http://docs.aws.amazon.com/lambda/latest/dg/walkthrough-s3-events-adminuser-prepare.html).
Create a lambda execution role with the required `route53-controller`
IAM policy, and upload the zip file created by `./bin/lambda-package.js`.

```
$ node bin/lambda-package.js --resource resource.json
```

After uploading the lambda function, you could invoke it either with the AWS console, or via the CLI:
```
$ aws lambda invoke --region us-west-2 --function-name route53-controller  --invocation-type RequestResponse --log-type Tail  --payload '{}' lambda-output.txt
```
Make sure to invoke the function with the `region`and `function-name`
you chose.  `route53-controller` does not currently read the payload.

## Uploading lambda code directly

`route53-controller` provides a convenience script to upload the lambda file directly.

```
$ node bin/upload-lambda.js --resource resource.json --role arn:aws:iam::NNNNNNNNNNNN:role/lambda_role --region=us-west-2
```

`upload-lambda` will create a Lambda function `route53-controller` if
one does not already exist, and update the function code if it does.


## Trigger Lambda function when autoscaling group changes

See the Auto Scaling developer guide ["Getting Notifications When Your
Auto Scaling Group
Changes"](http://docs.aws.amazon.com/AutoScaling/latest/DeveloperGuide/ASGettingNotifications.html)
to set up SNS notifications when your autoscaling group changes.

Then see the Amazon Simple Notification Service Developer Guide
["Invoking Lambda functions using Amazon SNS
notifications"](http://docs.aws.amazon.com/sns/latest/dg/sns-lambda.html)
to trigger the lambda function the SNS event.

## Storing `resource.json` in S3

If `resource.json` must be updated frequently, it may be more
convenient to fetch `resource.json` from a static location in S3,
where it can be updated without requiring redeployment of the Lambda
function.  

The S3 location is describe by an `s3Location.json` file.  For example: 

```javascript
{
    "Bucket": "my-bucket",
    "Key": "resource.json"
}
```

The resource file may be uploaded by `./bin/upload.js`

```
$ node bin/upload.js s3Location.json resource.json
```

Now `route53-controller` requires read access to the static s3 location.
```
$ node bin/create-policy.js --s3location s3Location.json
```

Then, we may provide the `s3location.json` file in place of `resource.json`.
```
$ node bin/update.js --s3location s3Location.json
$ node bin/lambda-package.js --s3location s3Location.json
```

