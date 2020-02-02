const core = require('@actions/core');
const github = require('@actions/github');
const statusSet = new Set(['queued', 'in_progress']);

async function main() {
  const { eventName, sha, ref, repo: { owner, repo } } = github.context;
  const branch = ref.slice(11);
  console.log({ eventName, sha, branch, owner, repo });
  const workflow_id = core.getInput('workflow-name', { required: true });
  const token = core.getInput('access-token', { required: true });
  console.log(`Found input: ${workflow}`);
  console.log(`Found token: ${token ? 'yes' : 'no'}`);
  const octokit = new github.GitHub(token);
  const { data } = await octokit.actions.listWorkflowRuns({ workflow_id });
  console.log(`Found ${data.total_count} runs total.`);
  const others = data.workflow_runs.filter(
    o => o.head_branch === branch && o.head_sha !== sha && statusSet.has(o.status)
  );
  console.log(`Found ${others.length} runs in progress.`);
  for (const { id, head_sha, status } of others) {
    console.log('Cancelling another run: ', { id, head_sha, status });
    const res = await octokit.actions.cancelWorkflowRun({ run_id: id });
    console.log(`Status ${res.status}`);
  }
  console.log('Done.');
}

main()
  .then(() => core.info('Cancel Complete.'))
  .catch(e => core.setFailed(e.message));