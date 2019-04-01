"use strict";
const dynamoHelper = require('./helpers/dynamoHelper');
const userHelper = require('./helpers/userHelper');
const utils = require('./helpers/utils');
const AJV = require('ajv');
const projectTeamSchema = require('./schema/projectTeamParams');
const ajv = new AJV({schemas : [projectTeamSchema]});

module.exports.handler = async(event) => {
  const body = JSON.parse(event.body);
  const projectId = event.pathParameters.projectId;
  const username = await userHelper.getUserData(event);

  const isValid = ajv.validate('projectTeamParams', body);

  if(!isValid){
    console.error('The body received has invalid structure');
    console.error(ajv.errors);
    return {
      statusCode : 400,
      body : JSON.stringify({
        message : 'The body received has invalid structure'
      })
    };
  }

  let workers;

  try {
    workers = await dynamoHelper.getAllWorkers();
  } catch(dynamoError) {
    console.error(dynamoError);

    return {
      statusCode : 500,
      body : JSON.stringify({
        message: dynamoError.message
      })
    };
  }

  if(!workers){
    return {
      statusCode : 500,
      body : JSON.stringify({
        message : 'No workers found'
      })
    }
  }

  const team = utils.prepareTeam(body, workers);

  return {
    statusCode : 200,
    body : JSON.stringify(team)
  }
};