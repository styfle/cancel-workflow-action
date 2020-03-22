# Cancel Workflow Action

This is a Github Action that will cancel any previous runs that are not `completed` for a given workflow.

This includes runs with a [status](https://developer.github.com/v3/checks/runs/#parameters-1) of `queued` or `in_progress`.

## How does it work?

When you `git push`, this action will capture the Branch and SHA. It will query GitHub's API to find workflow runs that match the Branch but do not match the SHA (these would be previous pushes) and cancel all of these in-progress runs so that the latest run (current SHA) will finish.

Read more about the [Workflow Runs API](https://developer.github.com/v3/actions/workflow_runs/).

## Usage

- Visit https://github.com/settings/tokens to generate a token with `public_repo` scope (or full `repo` scope for private repos).
- Visit `https://github.com/:org/:repo/settings/secrets` to add a secret called `GH_ACCESS_TOKEN` with the token as the value.
- Visit `https://api.github.com/repos/:org/:repo/actions/workflows` to find the Workflow ID you wish to auto-cancel.
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
      - uses: styfle/cancel-workflow-action@0.2.0
        with:
          workflow_id: 479426
          access_token: ${{ secrets.GH_ACCESS_TOKEN }}
```

Note: `workflow_id` accepts a comma separated list of IDs.

At the time of writing `0.2.0` is the latest release but you can select any [release](https://github.com/styfle/cancel-workflow-action/releases).

## Contributing

- Clone this repo
- Run `yarn install`
- Edit `./src/index.ts`
- Run `yarn build`
- Commit changes including `./dist/index.js` bundle
