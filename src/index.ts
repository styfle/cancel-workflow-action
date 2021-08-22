import * as core from '@actions/core';
import * as github from '@actions/github';

if (!github) {
  throw new Error('Module not found: github');
}

if (!core) {
  throw new Error('Module not found: core');
}

async function main() {
  const {
    eventName,
    sha,
    ref,
    repo: { owner, repo },
    payload,
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
  const workflow_id = core.getInput('workflow_id', { required: false });
  const disqualifying_jobs_input = core.getInput('disqualifying_jobs', { required: false });
  const disqualifying_jobs = disqualifying_jobs_input ? JSON.parse(disqualifying_jobs_input) : null;
  const ignore_sha = core.getBooleanInput('ignore_sha', { required: false });
  const all_but_latest = core.getBooleanInput('all_but_latest', { required: false });
  console.log(`Found token: ${token ? 'yes' : 'no'}`);
  console.log(
    disqualifying_jobs
      ? `Skipping cancel if job in ${disqualifying_jobs}`
      : 'No disqualifying jobs',
  );
  const workflow_ids: string[] = [];
  const octokit = github.getOctokit(token);

  const { data: current_run } = await octokit.actions.getWorkflowRun({
    owner,
    repo,
    run_id: Number(GITHUB_RUN_ID),
  });

  if (workflow_id) {
    // The user provided one or more workflow id
    workflow_id
      .replace(/\s/g, '')
      .split(',')
      .forEach(n => workflow_ids.push(n));
  } else {
    // The user did not provide workflow id so derive from current run
    workflow_ids.push(String(current_run.workflow_id));
  }
  console.log(`Found workflow_id: ${JSON.stringify(workflow_ids)}`);
  const trigger_repo_id = (payload.workflow_run || current_run).head_repository.id;
  await Promise.all(
    workflow_ids.map(async workflow_id => {
      try {
        const {
          data: { total_count, workflow_runs },
        } = await octokit.actions.listWorkflowRuns({
          per_page: 100,
          owner,
          repo,
          // @ts-ignore
          workflow_id,
          branch,
        });
        console.log(`Found ${total_count} runs total.`);
        let cancelBefore = new Date(current_run.created_at);
        if (all_but_latest) {
          const n = workflow_runs
            .map(run => new Date(run.created_at).getTime())
            .reduce((a, b) => Math.max(a, b), cancelBefore.getTime());
          cancelBefore = new Date(n);
        }

        if (disqualifying_jobs && !Array.isArray(disqualifying_jobs)) {
          core.setFailed('Disqualifying jobs found but is not array');
        }

        const workflow_jobs = (
          disqualifying_jobs && disqualifying_jobs.length > 0
            ? await Promise.all(
                workflow_runs.map(async ({ id, jobs_url }) => {
                  const {
                    data: { jobs },
                  } = await octokit.request(`GET ${jobs_url}`, {
                    owner,
                    repo,
                    run_id: id,
                  });
                  return {
                    workflow_run_id: id,
                    jobs: jobs.filter(
                      ({ status, name }: any) =>
                        status === 'in_progress' && disqualifying_jobs.includes(name),
                    ),
                  };
                }),
              )
            : []
        ).filter(workflow => workflow.jobs.length > 0);

        if (workflow_jobs.length) {
          console.log('Found disqualifying jobs running, skipping cancel', workflow_jobs);
          workflow_runs.length = 0;
        }

        const runningWorkflows = workflow_runs.filter(
          run =>
            run.head_repository.id === trigger_repo_id &&
            run.id !== current_run.id &&
            (ignore_sha || run.head_sha !== headSha) &&
            run.status !== 'completed' &&
            new Date(run.created_at) < cancelBefore,
        );
        if (all_but_latest && new Date(current_run.created_at) < cancelBefore) {
          // Make sure we cancel this run itself if it's out-of-date.
          // We must cancel this run last so we can cancel the others first.
          runningWorkflows.push(current_run);
        }
        console.log(`Found ${runningWorkflows.length} runs to cancel.`);
        for (const { id, head_sha, status, html_url } of runningWorkflows) {
          console.log('Canceling run: ', { id, head_sha, status, html_url });
          const res = await octokit.actions.cancelWorkflowRun({
            owner,
            repo,
            run_id: id,
          });
          console.log(`Cancel run ${id} responded with status ${res.status}`);
        }
      } catch (e) {
        const msg = e.message || e;
        console.log(`Error while canceling workflow_id ${workflow_id}: ${msg}`);
      }
      console.log('');
    }),
  );
}

main()
  .then(() => core.info('Cancel Complete.'))
  .catch(e => core.setFailed(e.message));
