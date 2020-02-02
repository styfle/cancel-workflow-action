const core = require('@actions/core');
const github = require('@actions/github');

try {
  const { eventName, sha, ref, repo } = github.context;
  const workflow = core.getInput('workflow-name');
  const token = core.getInput('access-token');
  console.log(`Found input: ${workflow}`);
  console.log(`Found token: ${token ? 'yes' : 'no'}`);
  console.log({ eventName, sha, ref, repo });
} catch (error) {
  core.setFailed(error.message);
}
