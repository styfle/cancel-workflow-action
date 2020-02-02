# Cancel In-Progress Workflow Runs

This action will cancel any queued or in-progress jobs for a given workflow.


## Example usage

Generate a personal access token with `public_repo`.

Then add a secret called `GH_ACCESS_TOKEN` to your repository.

```yml
name: Cancel
on: [push]
jobs:
  cancel:
    uses: styfle/cancel-workflow-action@v1
    with:
      workflow_id: 'continuous-integration.yml'
      access_token: ${{ secrets.GH_ACCESS_TOKEN }}
```

## Contributing

- Clone this repo
- Run `yarn install`
- Edit `./src/index.js`
- Run `yarn build`
- Commit changes including `./index.js` bundle