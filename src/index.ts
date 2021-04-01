import * as core from '@actions/core';
import * as github from '@actions/github';

if (!github) {
  throw new Error('Module not found: github');
}

if (!core) {
  throw new Error('Module not found: core');
}

async function main(): Promise<void> {
  const {
    eventName,
    sha,
    ref,
    repo: { owner, repo },
    payload
  } = github.context;
  const { GITHUB_RUN_ID } = process.env;

  let branch = ref.slice(11);
  let headSha = sha;
  if (payload.pull_request) {
    branch = payload.pull_request.head.ref;
    headSha = payload.pull_request.head.sha;
  } else if (payload.workflow_run) {
    branch = payload.workflow_run.head_branch;
    headSha = payload.workflow_run.head_sha;
  }

  console.log({ eventName, sha, headSha, branch, owner, repo, GITHUB_RUN_ID });
  const token = core.getInput('access_token', { required: true });
  const workflow_id_input = core.getInput('workflow_id', { required: false });
  const ignore_sha = core.getInput('ignore_sha', { required: false }) === 'true';
  const all_but_latest = core.getInput('all_but_latest', { required: false }) === 'true';
  console.log(`Found token: ${token ? 'yes' : 'no'}`);
  const workflow_ids: number[] = [];
  const octokit = github.getOctokit(token);

  const { data: current_run } = await octokit.actions.getWorkflowRun({
    owner,
    repo,
    run_id: Number(GITHUB_RUN_ID)
  });

  if (workflow_id_input) {
    // The user provided one or more workflow id
    const workflow_ids_input = workflow_id_input.replace(/\s/g, '').split(',');
    for (const id of workflow_ids_input) {
      workflow_ids.push(parseInt(id, 10));
    }
  } else {
    // The user did not provide workflow id so derive from current run
    workflow_ids.push(current_run.workflow_id);
  }

  console.log(`Found workflow_id: ${JSON.stringify(workflow_ids)}`);

  await Promise.all(
    workflow_ids.map(async workflow_id => {
      try {
        const { data } = await octokit.actions.listWorkflowRuns({
          per_page: 100,
          owner,
          repo,
          workflow_id,
          branch
        });

        const branchWorkflows = data.workflow_runs.filter(run => run.head_branch === branch);
        console.log(
          `Found ${branchWorkflows.length} runs for workflow ${workflow_id} on branch ${branch}`
        );
        console.log(branchWorkflows.map(run => `- ${run.html_url} @ ${run.created_at}`).join('\n'));

        // Filter for only uncompleted workflow runs
        let runningWorkflows = branchWorkflows.filter(run => run.status !== 'completed');
        console.log(`${runningWorkflows.length} of the workflows are not completed`);

        // Filter out for only our headSha unless ignoring it
        runningWorkflows = runningWorkflows.filter(run => ignore_sha || run.head_sha !== headSha);
        console.log(`${runningWorkflows.length} of those workflows pass the SHA filter`);

        // In all_but_latest mode, we calculate our cancel time as the very latest run available,
        // including possibly runs queued after this one, but before this runs if the queue was deep
        // Otherwise we just use the current run time to cancel those before this run
        let cancel_before: Date;
        if (all_but_latest) {
          cancel_before = new Date(
            data.workflow_runs.reduce((a, b) =>
              new Date(a.created_at) > new Date(b.created_at) ? a : b
            ).created_at
          );
        } else {
          cancel_before = new Date(current_run.created_at);
        }
        console.log(`Canceling matching runs enqueued before ${cancel_before}`);

        // Filter workflow runs over time - retain only runs queued after our cancel time
        runningWorkflows = runningWorkflows.filter(run => {
          // In all_but_latest mode, we must not cancel ourselves until we have canceled the rest
          if (all_but_latest && run.id === current_run.id) {
            return false;
          }
          return new Date(run.created_at) < cancel_before;
        });
        console.log(`${runningWorkflows.length} of the workflows are in a time range to cancel`);

        console.log(`${runningWorkflows.length} matching runs to cancel.`);
        await cancelWorkflowRuns(runningWorkflows, owner, repo, token);

        // In all_but_latest_mode, we may need to cancel ourselves as well.
        // We postponed canceling this run because otherwise we couldn't cancel the rest.
        if (all_but_latest && new Date(current_run.created_at) < cancel_before) {
          console.log('in all_but_latest mode and canceling ourselves now');
          await cancelWorkflowRuns([current_run], owner, repo, token);
        }
      } catch (e) {
        const msg = e.message || e;
        console.log(`Error while canceling workflow_id ${workflow_id}: ${msg}`);
      }
      console.log('');
    })
  );
}

async function cancelWorkflowRuns(
  runningWorkflows: { id: number; head_sha: string; status: string; html_url: string }[],
  owner: string,
  repo: string,
  token: string
): Promise<void> {
  const octokit = github.getOctokit(token);
  const promises = [];
  for (const { id, head_sha, status, html_url } of runningWorkflows) {
    console.log('Canceling run: ', { id, head_sha, status, html_url });
    const current_promise = octokit.actions
      .cancelWorkflowRun({
        owner,
        repo,
        run_id: id
      })
      .then(res => {
        console.log(`Cancel run ${id} responded with status ${res.status}`);
      });
    promises.push(current_promise);
  }
  await Promise.all(promises);
}

main()
  .then(() => core.info('Cancel Complete.'))
  .catch(e => core.setFailed(e.message));
