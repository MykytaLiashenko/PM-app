"use strict";
const userHelper = require('./helpers/userHelper');
const dynamoHelper = require('./helpers/dynamoHelper');
const utils = require('./helpers/utils');
const _ = require('lodash');

module.exports.handler = async(event) => {
  const projectId = event.pathParameters.projectId;
  const username = userHelper.getUserData(event);

  let project;
  try {
    project = await dynamoHelper.getProject(projectId, username);
  } catch(dynamoError){
    console.error(dynamoError);

    return {
      statusCode : 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body : JSON.stringify({
        message: dynamoError.message
      })
    };
  }

  if(!project){
    return {
      statusCode : 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body : JSON.stringify({
        message : 'No project found'
      })
    }
  }

  if(!project.tasks || !project.tasks.length){
    return {
      statusCode : 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body : JSON.stringify({
        message : 'No project tasks found'
      })
    }
  }

  const {tasks, graph} = utils.prepareGraphAndOrder(project.tasks);

  const tasksWithDirectCount = utils.countDirect(tasks, graph);

  const projectDuration = utils.countProjectDuration(tasksWithDirectCount);

  const tasksBackward = utils.countBackward(tasksWithDirectCount, graph);

  const tasksWithCriticalPath = utils.countCriticalPath(tasksBackward);

  const tasksFloats = utils.countFloats(tasksWithCriticalPath);

  const tasksFreeFloat = utils.countFreeFloat(tasksFloats, graph);

  project = _.omit(project, ['projectId']);
  project.tasks = tasksFreeFloat;
  project.projectDuration = projectDuration;
  project.graph = graph;

  const {updateString, expressionAttributeValues, expressionAttributeNames} = utils.prepareUpdateStringAndObject(project);

  try {
    const updatedObject = await dynamoHelper.updateProject({
      UpdateExpression: updateString,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      Key: {
        projectId
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(_.omit(updatedObject, ['username', 'graph']))
    };
  } catch (dynamoError) {
    console.error(dynamoError.message);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(
        {
          message: dynamoError.message
        }
      )
    }
  }
};