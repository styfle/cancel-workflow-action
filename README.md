# Cancel Workflow Action

This is a GitHub Action that will cancel any previous runs that are not `completed` for a given workflow.

This includes runs with a [status](https://docs.github.com/en/rest/reference/checks#check-runs) of `queued` or `in_progress`.

## How does it work?

When you `git push`, this GitHub Action will capture the current Branch and SHA. It will query GitHub's API to find previous workflow runs that match the Branch but do not match the SHA. These in-progress runs will be canceled leaving only this run, or the [latest run](#advanced-all-but-latest).

Read more about the [Workflow Runs API](https://docs.github.com/en/rest/reference/actions#workflow-runs).

## Usage

Typically, you will want to add this action as the first step in a workflow so it can cancel itself on the next push.

```yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Cancel Previous Runs
        uses: styfle/cancel-workflow-action@0.9.0
        with:
          access_token: ${{ github.token }}
      #- name: Run Tests
      #  uses: actions/setup-node@v1
      #  run: node test.js
      # ... etc
```

### Advanced: Canceling Other Workflows

In some cases, you may wish to avoid modifying all your workflows and instead create a new workflow that cancels your other workflows. This can be useful when you have a problem with workflows getting queued.

- Visit `https://api.github.com/repos/:org/:repo/actions/workflows` to find the Workflow ID(s) you wish to automaticaly cancel.
- Add a new file `.github/workflows/cancel.yml` with the following:

```yml
name: Cancel
on: [push]
jobs:
  cancel:
    name: 'Cancel Previous Runs'
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - uses: styfle/cancel-workflow-action@0.9.0
        with:
          workflow_id: 479426
          access_token: ${{ github.token }}
```

- _Note_: `workflow_id` can be a Workflow ID (number) or Workflow File Name (string)
- _Note_: `workflow_id` also accepts a comma separated list if you need to cancel multiple workflows

### Advanced: Pull Requests from Forks

The default GitHub token access is unable to cancel workflows for `pull_request`
when a pull request is opened from a fork. Therefore, a special setup using
`workflow_run`, which also works for `push`, is needed.
Create a `.github/workflows/cancel.yml` with the following instead and replace
"CI" with the workflow name that contains the `pull_request` workflow:

```yml
name: Cancel
on:
  workflow_run:
    workflows: ["CI"]
    types:
      - requested
jobs:
  cancel:
    runs-on: ubuntu-latest
    steps:
    - uses: styfle/cancel-workflow-action@0.9.0
      with:
        workflow_id: ${{ github.event.workflow.id }}
```

### Advanced: Ignore SHA

In some cases, you may wish to cancel workflows when you close a Pull Request. Because this is not a push event, the SHA will be the same, so you must use the `ignore_sha` option.

```yml
on:
  pull_request:
    types: [closed]
jobs:
  cleanup:
    name: 'Cleanup After PR Closed'
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - name: Cancel build runs
        uses: styfle/cancel-workflow-action@0.9.0
        with:
          ignore_sha: true
          workflow_id: 479426
```

### Advanced: All But Latest

Because this action can only cancel workflows if it is actually being run, it only helps if the pipeline isn't saturated and there are still runners available to schedule the workflow.

By default, this action does not cancel any workflows created after itself. The `all_but_latest` flags allows the action to cancel itself and all later-scheduled workflows, leaving only the latest.

```yml
name: Cancel
on: [push]
jobs:
  cancel:
    name: 'Cancel Previous Runs'
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - uses: styfle/cancel-workflow-action@0.9.0
        with:
          all_but_latest: true
          access_token: ${{ github.token }}
```

### Advanced: Token Permissions

No change to permissions is required by default. The instructions below are for improved control over of those permissions.

By default, GitHub creates the `GITHUB_TOKEN` for Actions with some read/write permissions. It may be a good practice to switch to read-only permissions by default. Visit the [dedicated documentation page](https://docs.github.com/en/github/administering-a-repository/managing-repository-settings/disabling-or-limiting-github-actions-for-a-repository#setting-the-permissions-of-the-github_token-for-your-repository) for details.

Permissions can be set for all Jobs in a Workflow or a specific Job, see the [reference manual page](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#permissions). `cancel-workflow-action` only requires write access to the `actions` scope, so it is enough to have:

```yml
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      actions: write
    steps:
      - name: Cancel Previous Runs
        uses: styfle/cancel-workflow-action@0.9.0
        with:
          access_token: ${{ github.token }}
```

_Note_ : This is typical when global access is set to be restrictive. Only this job will elevate those permissions.

## Contributing

- Clone this repo
- Run `yarn install`
- Edit `./src/index.ts`
- Run `yarn build`
- Commit changes including `./dist/index.js` bundle
