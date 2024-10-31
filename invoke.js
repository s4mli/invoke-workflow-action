const github = require("@actions/github");

const COMPLETED = "completed";
const SUCCEEDED = "success";
const INTERVAL = 5000;

const sleep = (ms) => {
  return new Promise((r) => {
    setTimeout(r, ms);
  });
};

const workflow_runner = (pat) => {
  const octokit = github.getOctokit(pat);
  const repository_dispatch = async (
    owner,
    repo,
    event_type,
    client_payload
  ) => {
    const { status } = await octokit.rest.repos.createDispatchEvent({
      owner,
      repo,
      event_type,
      client_payload,
    });
    return { code: status, created: new Date().toISOString() };
  };
  const get_workflow_runs = async (owner, repo, created) => {
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
  const get_workflow_run_status = async (owner, repo, run_id) => {
    const { data } = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id,
    });
    return data;
  };
  return {
    repository_dispatch,
    get_workflow_runs,
    get_workflow_run_status,
  };
};

const invoke = async (pat, owner, repo, event_type, client_payload) => {
  const runner = workflow_runner(pat);
  const { code, created } = await runner.repository_dispatch(
    owner,
    repo,
    event_type,
    client_payload
  );
  if (204 !== code) throw new Error(`Invoke workflow failed ${code}`);
  console.log("Workflow invoked with payload", client_payload);
  await sleep(INTERVAL);
  const runs = await runner.get_workflow_runs(owner, repo, created);
  if (runs.length <= 0) throw new Error(`No workflow runs for ${event_type}`);
  let { id, status, created_at, conclusion, html_url } = runs.find(
    (r) => COMPLETED !== r.status
  );
  console.log(`Workflow run ${id}`, { status, created_at });
  for (;;) {
    ({ id, status, conclusion, html_url } =
      await runner.get_workflow_run_status(owner, repo, id));
    console.log(`Poll workflow run ${id}`, { status, conclusion });
    if (COMPLETED === status) break;
    await sleep(INTERVAL);
  }
  const message = `Workflow run ${id} ${status} with ${conclusion}, see ${html_url} for more details`;
  if (SUCCEEDED !== conclusion) {
    throw new Error(message);
  } else {
    console.log(message);
  }
};

module.exports = { invoke };
