import * as core from '@actions/core';
import * as github from '@actions/github';

if (!github) {
    throw new Error('Module not found: github');
}

if (!core) {
    throw new Error('Module not found: core');
}

async function main() {
    console.log("hello TypeScript")
    const {repo: {owner, repo}} = github.context;
    if (!github.context.payload.pull_request) {
        console.error("Action available only at pull_request")
        return
    }
    const branch = github.context.payload.pull_request.head.ref;
    const headSha = github.context.payload.pull_request.head.sha;

    // console.log({eventName, sha, headSha, branch, owner, repo});
    const token = core.getInput('access_token', {required: true});
    console.log(`Found token: ${token ? 'yes' : 'no'}`);
    const octokit = new github.GitHub(token);

    const allWorkflows = await octokit.actions.listRepoWorkflows({
        owner: owner,
        repo: repo
    })
    const workflow = allWorkflows.data.workflows.find(wf => wf.name === github.context.workflow)
    if (workflow === undefined) {
        console.error(`can't find workflow ${github.context.workflow}`)
        return
    }
    const runs = (await octokit.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: workflow.id,
        branch
    })).data;

    const pull_request = github.context.payload.pull_request
    const runningWorkflows = runs.workflow_runs.filter(
        run => run.head_sha !== headSha && // PR смотрит на другой коммит
            run.status !== 'completed' &&  // PR не собран
            run.pull_requests.some(pr => pr.number === pull_request.number)
    );
    console.log(`Found ${runningWorkflows.length} runs in progress.`);
    for (const {id, head_sha, status} of runningWorkflows) {
        try {
            console.log('Cancelling another run: ', {id, head_sha, status});
            const res = await octokit.actions.cancelWorkflowRun({
                owner,
                repo,
                run_id: id
            });
            console.log(`Status ${res.status}`);
        } catch (e) {
            const msg = e.message || e;
            console.log(`Error while cancelling workflow_id ${workflow.id}: ${msg}`);
        }
    }
    console.log('Done.');
}

main()
    .then(() => core.info('Cancel Complete.'))
    .catch(e => core.setFailed(e.message));
