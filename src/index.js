const core = require('@actions/core');
const github = require('@actions/github');

try {
  const workflow = core.getInput('workflow-name');
  console.log(`Found input ${workflow}!`);
  // Get the JSON webhook payload for the event that triggered the workflow
  delete github.context.payload;
  const payload = JSON.stringify(github.context, undefined, 2)
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
