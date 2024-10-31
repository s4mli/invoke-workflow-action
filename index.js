const core = require("@actions/core");
const { invoke } = require("./invoke");

(async () => {
  try {
    const pat = core.getInput("pat");
    const repo = core.getInput("repo");
    const type = core.getInput("type");
    const owner = core.getInput("owner");
    const payload = JSON.parse(core.getInput("payload") || "{}");
    await invoke(pat, owner, repo, type, payload);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
