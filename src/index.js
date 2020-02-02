const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
  const { eventName, sha, ref, repo: { owner, repo } } = github.context;
  const branch = ref.slice(11);
  console.log({ eventName, sha, branch, owner, repo });
  const workflow_id = core.getInput('workflow_id', { required: true });
  const token = core.getInput('access_token', { required: true });
  console.log(`Found input: ${workflow_id}`);
  console.log(`Found token: ${token ? 'yes' : 'no'}`);
  const octokit = new github.GitHub(token);
  const { data } = await octokit.actions.listWorkflowRuns({ owner, repo, workflow_id });
  console.log(`Found ${data.total_count} runs total.`);
  console.log(data);
  const others = data.workflow_runs.filter(
    o => o.head_branch === branch && o.head_sha !== sha && o.status !== 'completed'
  );
  console.log(`Found ${others.length} runs in progress.`);
  for (const { id, head_sha, status } of others) {
    console.log('Cancelling another run: ', { id, head_sha, status });
    const res = await octokit.actions.cancelWorkflowRun({ owner, repo, run_id: id });
    console.log(`Status ${res.status}`);
  }
  console.log('Done.');
}

main()
  .then(() => core.info('Cancel Complete.'))
  .catch(e => core.setFailed(e.message));