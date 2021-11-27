// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const AWS = require('aws-sdk');
const StaticFileHandler = require("serverless-aws-static-file-handler")

// Store meetings in a DynamoDB table so attendees can join by meeting title
const ddb = new AWS.DynamoDB();

// Create an AWS SDK Chime object. Region 'us-east-1' is currently required.
// Use the MediaRegion property below in CreateMeeting to select the region
// the meeting is hosted in.
const chime = new AWS.Chime({ region: 'us-east-1' });

// Set the AWS SDK Chime endpoint. The global endpoint is https://service.chime.aws.amazon.com.
chime.endpoint = new AWS.Endpoint('https://service.chime.aws.amazon.com/console');

const oneDayFromNow = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

// Read resource names from the environment
const meetingsTableName = process.env.MEETINGS_TABLE_NAME;
const attendeesTableName = process.env.ATTENDEES_TABLE_NAME;

// Create a unique id
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

exports.index = async (event, context, callback) => {
    const clientFilesPath = __dirname + "./html/";
    const fileHandler = new StaticFileHandler(clientFilesPath);
    return fileHandler.get(event,context);
}

// === Handlers ===

const getMeeting = async (meetingTitle) => {
    const result =  await ddb.getItem ({
        TableName: meetingsTableName,
        Key: {
            'Title': {
                S: meetingTitle
            },
        },
    }).promise();
    return result.Item ? JSON.parse(result.Item.Data.S) : null;
}

const putMeeting = async(title, meetingInfo) => {
    await ddb.putItem({
        TableName: meetingsTableName,
        Item: {
            'Title': { S: title },
            'Data': { S: JSON.stringify(meetingInfo) },
            'TTL': {
                N: '' + oneDayFromNow
            }
        }
    }).promise();
}

const getAttendee = async (title, attendeeId) => {
    const result = await ddb.getItem ({
        TableName: attendeesTableName,
        Key: {
            'AttendeeId': {
                S: `${title}/${attendeeId}`
            }
        }
    }).promise();
    if(!result.Item) {
        return 'Unknown';
    }
    return result.Item.Name.S;
}

const putAttendee = async(title, attendeeId, name) => {
    await ddb.putItem ({
        TableName: attendeesTableName,
        Item: {
            'AttendeeId': {
                S: `${title}/${attendeeId}`
            },
            'Name': { S: name },
            'TTL': {
                N: '' + oneDayFromNow
            }
        }
    }).promise();
}

exports.join = async (event, context, callback) => {
    var response = {
      "statusCode": 200,
      "headers": {},
      "body": '',
      "isBase64Encoded": false
    };
    const title = event.queryStringParameters.title;
    const name = event.queryStringParameters.name;
    const region = event.queryStringParameters.region || 'us-east-1';
  
    if (!title || !name) {
      response["statusCode"] = 400;
      response["body"] = "Must provide title and name";
      callback(null, response);
      return;
    }
  
    let meetingInfo = await getMeeting(title);
    if (!meetingInfo) {
      const request = {
        ClientRequestToken: uuid(),
        MediaRegion: region,
      };
      console.info('Creating new meeting before joining: ' + JSON.stringify(request));
      meetingInfo = await chime.createMeeting(request).promise();
      await putMeeting(title, meetingInfo);
    }
  
    console.info('Adding new attendee');
    const attendeeInfo = (await chime.createAttendee({
        MeetingId: meetingInfo.Meeting.MeetingId,
        ExternalUserId: uuid(),
      }).promise());
    putAttendee(title, attendeeInfo.Attendee.AttendeeId, name);
  
    const joinInfo = {
      JoinInfo: {
        Title: title,
        Meeting: meetingInfo.Meeting,
        Attendee: attendeeInfo.Attendee
      },
    };
  
    response.body = JSON.stringify(joinInfo, '', 2);
    callback(null, response);
};
  
exports.end = async (event, context, callback) => {
    var response = {
      "statusCode": 200,
      "headers": {},
      "body": '',
      "isBase64Encoded": false
    };
    const title = event.queryStringParameters.title;
    let meetingInfo = await getMeeting(title);
    await chime.deleteMeeting({
      MeetingId: meetingInfo.Meeting.MeetingId,
    }).promise();
    callback(null, response);
};
  
exports.attendee = async (event, context, callback) => {
    var response = {
      "statusCode": 200,
      "headers": {},
      "body": '',
      "isBase64Encoded": false
    };
    const title = event.queryStringParameters.title;
    const attendeeId = event.queryStringParameters.attendee;
    const attendeeInfo = {
      AttendeeInfo: {
        AttendeeId: attendeeId,
        Name: await getAttendee(title, attendeeId),
      },
    };
    response.body = JSON.stringify(attendeeInfo, '', 2);
    callback(null, response);
}
  