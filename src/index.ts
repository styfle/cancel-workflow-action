import * as core from '@actions/core';
import * as github from '@actions/github';

if (!github) {
  throw new Error('Module not found: github');
}

if (!core) {
  throw new Error('Module not found: core');
}

async function main() {
  const { eventName, sha, ref, repo: { owner, repo }, payload } = github.context;
  const { GITHUB_RUN_ID } = process.env;

  let branch = ref.slice(11);
  let headSha = sha;
  if (payload.pull_request) {
    branch = payload.pull_request.head.ref;
    headSha = payload.pull_request.head.sha;
  }

  console.log({ eventName, sha, headSha, branch, owner, repo, GITHUB_RUN_ID });
  const token = core.getInput('access_token', { required: true });
  const workflow_id = core.getInput('workflow_id', { required: false });
  console.log(`Found token: ${token ? 'yes' : 'no'}`);
  const workflow_ids: number[] = [];
  const octokit = github.getOctokit(token);

  const { data: current_run } = await octokit.actions.getWorkflowRun({
    owner,
    repo,
    run_id: Number(GITHUB_RUN_ID)
  });

  if (workflow_id) {
    // The user provided one or more workflow id
    workflow_id.replace(/\s/g, '')
      .split(',')
      .map(s => Number(s))
      .forEach(n => workflow_ids.push(n));
  } else {
    // The user did not provide workflow id so derive from current run
    workflow_ids.push(current_run.workflow_id);
  }

  console.log(`Found workflow_id: ${JSON.stringify(workflow_ids)}`);

  await Promise.all(workflow_ids.map(async (workflow_id) => {
    try {
      const { data } = await octokit.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id,
        branch
      });
      console.log(`Found ${data.total_count} runs total.`);
      const runningWorkflows = data.workflow_runs.filter(
        run => run.head_branch === branch && run.head_sha !== headSha && run.status !== 'completed' &&
            new Date(run.created_at) < new Date(current_run.created_at)
      );
      console.log(`Found ${runningWorkflows.length} runs in progress.`);
      for (const {id, head_sha, status} of runningWorkflows) {
        console.log('Cancelling another run: ', {id, head_sha, status});
        const res = await octokit.actions.cancelWorkflowRun({
          owner,
          repo,
          run_id: id
        });
        console.log(`Cancel run ${id} responded with status ${res.status}`);
      }
    } catch (e) {
      const msg = e.message || e;
      console.log(`Error while cancelling workflow_id ${workflow_id}: ${msg}`);
    }
  }));
}

main()
  .then(() => core.info('Cancel Complete.'))
  .catch(e => core.setFailed(e.message));
