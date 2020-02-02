# Cancel In-Progress Workflow Runs

This action will cancel any queued or in-progress jobs for a given workflow.

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
    uses: styfle/cancel-workflow-action@v1
    with:
      workflow_id: 435869
      access_token: ${{ secrets.GH_ACCESS_TOKEN }}
```

## Contributing

- Clone this repo
- Run `yarn install`
- Edit `./src/index.js`
- Run `yarn build`
- Commit changes including `./index.js` bundle