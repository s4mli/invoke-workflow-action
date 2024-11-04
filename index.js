const core = require("@actions/core");
const invoke = require("./invoke");

(async () => {
  try {
    await invoke({
      repo: core.getInput("repo"),
      owner: core.getInput("owner"),
      event_type: core.getInput("type"),
      client_payload: JSON.parse(core.getInput("payload") || "{}"),
    });
  } catch (error) {
    core.setFailed(error.message);
  }
})();
