# invoke-workflow-action

Invoke a cross repository workflow and poll for its result

## Inputs

### `pat`

**Required** The Github access token with access to the repository.

### `owner`

**Required** The owner of the repository where the workflow is contained.

### `repo`

**Required** The repository where the workflow is contained.

### `type`

**Required** The event type of the workflow.

### `payload`

**Optional** The payload sent to the workflow.

## Example usage

```yaml
uses: s4mli/invoke-workflow-action@v1.0.0
with:
  pat: xxx
  owner: s4mli
  repo: test-flow
  type: test
  payload: '{"id": 1}'
```

## Limitation
Due to the design/limitation of Github API, do not trigger repository_dispatch event faster than once a second.
