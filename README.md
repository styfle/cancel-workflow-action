# Cancel Workflow Action

This is a Github Action that will cancel any previous runs that are not `completed` for a given workflow.

This includes runs with a [status](https://developer.github.com/v3/checks/runs/#parameters-1) of `queued` or `in_progress`.

## How does it work?

When you `git push`, this action will capture the branch name and SHA. It will query GitHub's API to find workflow runs that match the branch but do not match the SHA (these would be previous pushes) and cancel all of these in progresses runs so that the latest run is the only one.

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
    timeout-minutes: 3
    uses: styfle/cancel-workflow-action@v1
    with:
      workflow_id: 479426
      access_token: ${{ secrets.GH_ACCESS_TOKEN }}
```

## Contributing

- Clone this repo
- Run `yarn install`
- Edit `./src/index.js`
- Run `yarn build`
- Commit changes including `./index.js` bundle