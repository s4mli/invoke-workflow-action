const core = require("@actions/core");
const github = require("@actions/github");

const COMPLETED = "completed";
const SUCCEEDED = "success";
const INTERVAL = 5000;
const MAXRETRY = 3;

const sleep = (ms) => {
  return new Promise((r) => {
    setTimeout(r, ms);
  });
};

const workflowRunner = (pat) => {
  const octokit = github.getOctokit(pat);
  const repoDispatch = async ({ owner, repo, event_type, client_payload }) => {
    const { status } = await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type,
      client_payload,
    });
    return { code: status, created: new Date().toISOString() };
  };
  const listRepoWorkflowRuns = async ({ owner, repo, created }) => {
    const {
      data: { workflow_runs },
    } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      event: "repository_dispatch",
      created: `>=${created}`,
    });
    return workflow_runs;
  };
  const getWorkflowRunStatus = async ({ owner, repo, run_id }) => {
    const { data } = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id,
    });
    return data;
  };
  return {
    repoDispatch,
    listRepoWorkflowRuns,
    getWorkflowRunStatus,
  };
};

module.exports = async ({ owner, repo, event_type, client_payload }) => {
  const runner = workflowRunner(process.env.GITHUB_TOKEN);
  const { code, created } = await runner.repoDispatch({
    owner,
    repo,
    event_type,
    client_payload,
  });
  if (204 !== code) throw new Error(`Invoke workflow failed ${code}`);
  core.info(`Workflow invoked with ${JSON.stringify(client_payload, null, 2)}`);
  let runs = [];
  for (let k = 0; k < MAXRETRY; k++) {
    await sleep(INTERVAL * (k + 1));
    runs = await runner.listRepoWorkflowRuns({ owner, repo, created });
    if (runs.length <= 0) core.warning(`Retry-${k} listing workflowRuns`);
    else break;
  }
  if (runs.length <= 0) throw new Error(`List workflowRuns failed`);
  let { id, status, created_at, conclusion, html_url } = runs.findLast(
    (r) => COMPLETED !== r.status
  );
  core.info(`${id} ${JSON.stringify({ status, created_at }, null, 2)}`);
  for (;;) {
    ({ id, status, conclusion, html_url } = await runner.getWorkflowRunStatus({
      owner,
      repo,
      run_id: id,
    }));
    core.info(`Poll ${id} ${JSON.stringify({ status, conclusion }, null, 2)}`);
    if (COMPLETED === status) break;
    await sleep(INTERVAL);
  }
  const message = `WorkflowRun ${id} ${
    SUCCEEDED !== conclusion ? "failed" : "succeeded"
  }, see ${html_url}`;
  core.info(message);
  if (SUCCEEDED !== conclusion) throw new Error(message);
};
