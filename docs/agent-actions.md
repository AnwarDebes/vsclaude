# Agent actions

vsclaude recognizes **200 distinct agent behaviors**, the full
range of what a coding agent does. Each one is a first-class part of the IDE.

## How it is wired

- **Catalog** (`@vsclaude/contracts`): the canonical `AgentAction` catalog. Every
  action maps to a normalized `AgentEventType`, the `PixieState` it drives, a
  thematic category, and a plain-language caption.
- **Classification** (`@vsclaude/motion`): `classifyAction(event)` resolves any
  real event to its most specific action (the git kind, command keywords, or the
  tool name), and the mapper stamps the resolved `actionId` onto every
  `MotionDirective`.
- **Icons** (`apps/desktop`): one pixel symbol per action, extracted from the
  brand banner into a sprite. `ActionIcon` renders Pixie performing the action.
  The Pixie stage and the activity feed both use it.

Adding or changing an action is a single edit to the catalog; the motion layer,
the icons, and this document all follow.

## Core

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `greet` | `session_start` | `greeting` | Saying hello. |
| `think` | `thinking` | `thinking` | Thinking it through. |
| `plan` | `todo_update` | `planning` | Mapping the steps. |
| `message` | `message` | `thinking` | Sharing an update. |
| `ask` | `permission_request` | `waiting` | Asking you a question. |
| `read` | `file_read` | `reading` | Reading a file. |
| `create` | `file_create` | `typing` | Creating a new file. |
| `edit` | `file_edit` | `typing` | Editing a file. |
| `type` | `file_edit` | `typing` | Writing code. |
| `delete` | `file_delete` | `typing` | Deleting a file. |

## Explore

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `search` | `search` | `searching` | Searching the code. |
| `web` | `web_fetch` | `web` | Checking the web. |
| `fetch` | `web_fetch` | `web` | Fetching a resource. |
| `open` | `file_read` | `reading` | Opening the project. |
| `move` | `file_edit` | `typing` | Moving a file. |
| `run` | `command_run` | `running` | Running a command. |
| `output` | `command_output` | `running` | Watching the output. |
| `test` | `command_run` | `running` | Running the tests. |
| `build` | `command_run` | `building` | Building the app. |
| `install` | `command_run` | `building` | Installing packages. |

## Quality

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `format` | `file_edit` | `typing` | Formatting the code. |
| `lint` | `command_run` | `running` | Linting for issues. |
| `refactor` | `file_edit` | `typing` | Refactoring the code. |
| `debug` | `error` | `debugging` | Tracking down a bug. |
| `git` | `git_action` | `git` | Working with git. |
| `commit` | `git_action` | `git` | Committing the changes. |
| `branch` | `git_action` | `git` | Creating a branch. |
| `push` | `git_action` | `git` | Pushing to the remote. |
| `merge` | `git_action` | `git` | Merging branches. |
| `checkpoint` | `git_action` | `git` | Saving a checkpoint. |

## Orchestrate

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `tool` | `tool_call` | `running` | Using a tool. |
| `mcp` | `tool_call` | `running` | Calling an MCP tool. |
| `spawn` | `subagent_spawned` | `spawning` | Calling in a helper. |
| `handoff` | `subagent_finished` | `spawning` | A helper reports back. |
| `retry` | `command_run` | `running` | Trying again. |
| `wait` | `permission_request` | `waiting` | Waiting for your OK. |
| `cost` | `token_usage` | `thinking` | Tracking tokens and cost. |
| `done` | `complete` | `success` | All done. |
| `stuck` | `error` | `confused` | Hitting a snag. |
| `rest` | `session_end` | `idle` | Resting. |

## Version control

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `diff` | `file_edit` | `reading` | Reviewing the diff. |
| `approve` | `permission_request` | `success` | Approving the change. |
| `reject` | `permission_request` | `confused` | Rejecting the change. |
| `stage` | `git_action` | `git` | Staging the changes. |
| `stash` | `git_action` | `git` | Stashing for later. |
| `pull` | `git_action` | `git` | Pulling the latest. |
| `status` | `git_action` | `reading` | Checking git status. |
| `clone` | `git_action` | `git` | Cloning a repository. |
| `revert` | `git_action` | `git` | Reverting a change. |
| `tag` | `git_action` | `git` | Tagging a version. |

## Operate

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `deploy` | `command_run` | `building` | Deploying the app. |
| `schedule` | `tool_call` | `planning` | Scheduling a task. |
| `notify` | `message` | `thinking` | Sending a notification. |
| `watch` | `command_run` | `running` | Watching for changes. |
| `log` | `command_output` | `running` | Reading the logs. |
| `config` | `file_edit` | `typing` | Updating the config. |
| `secure` | `tool_call` | `running` | Securing secrets. |
| `memory` | `tool_call` | `thinking` | Saving to memory. |
| `docs` | `file_edit` | `typing` | Writing the docs. |
| `index` | `tool_call` | `building` | Building an index. |

## Understand

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `summarize` | `thinking` | `thinking` | Summarizing the work. |
| `explain` | `message` | `thinking` | Explaining the code. |
| `rename` | `file_edit` | `typing` | Renaming a symbol. |
| `init` | `command_run` | `building` | Initializing the project. |
| `env` | `file_edit` | `typing` | Setting environment variables. |
| `benchmark` | `command_run` | `running` | Running a benchmark. |
| `screenshot` | `tool_call` | `running` | Taking a screenshot. |
| `navigate` | `file_read` | `reading` | Jumping to a definition. |
| `compact` | `token_usage` | `thinking` | Compacting the context. |
| `translate` | `web_fetch` | `web` | Translating the text. |

## Inspect

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `pick` | `git_action` | `git` | Cherry-picking a commit. |
| `blame` | `git_action` | `reading` | Checking who changed this. |
| `bisect` | `git_action` | `debugging` | Bisecting to find the bug. |
| `profile` | `command_run` | `running` | Profiling performance. |
| `cache` | `tool_call` | `building` | Caching results. |
| `queue` | `tool_call` | `planning` | Queuing the work. |
| `sandbox` | `command_run` | `running` | Running in a sandbox. |
| `sign` | `tool_call` | `running` | Signing the build. |
| `verify` | `tool_call` | `success` | Verifying the result. |
| `migrate` | `command_run` | `building` | Running a migration. |

## Author

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `generate` | `file_create` | `typing` | Generating code. |
| `complete` | `file_edit` | `typing` | Completing the code. |
| `snippet` | `file_edit` | `typing` | Inserting a snippet. |
| `comment` | `file_edit` | `typing` | Adding a comment. |
| `sort` | `file_edit` | `typing` | Sorting the items. |
| `fold` | `file_read` | `reading` | Folding the code. |
| `patch` | `file_edit` | `typing` | Applying a patch. |
| `annotate` | `file_edit` | `typing` | Annotating the code. |
| `scaffold` | `file_create` | `typing` | Scaffolding a template. |
| `select` | `file_read` | `reading` | Selecting a region. |

## Git advanced

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `rebase` | `git_action` | `git` | Rebasing the branch. |
| `reset` | `git_action` | `git` | Resetting to a commit. |
| `amend` | `git_action` | `git` | Amending the commit. |
| `squash` | `git_action` | `git` | Squashing commits. |
| `fork` | `git_action` | `git` | Forking the repository. |
| `pr` | `git_action` | `git` | Opening a pull request. |
| `review` | `file_read` | `reading` | Reviewing the changes. |
| `prune` | `git_action` | `git` | Pruning stale branches. |
| `release` | `command_run` | `building` | Cutting a release. |
| `lockfile` | `file_edit` | `typing` | Updating the lockfile. |

## Runtime

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `serve` | `command_run` | `running` | Serving the app. |
| `preview` | `command_run` | `running` | Opening a preview. |
| `restart` | `command_run` | `running` | Restarting the process. |
| `stop` | `command_run` | `idle` | Stopping the process. |
| `kill` | `command_run` | `idle` | Killing the process. |
| `coverage` | `command_run` | `running` | Measuring coverage. |
| `bundle` | `command_run` | `building` | Bundling the assets. |
| `minify` | `command_run` | `building` | Minifying the output. |
| `audit` | `command_run` | `searching` | Auditing dependencies. |
| `update` | `command_run` | `building` | Updating dependencies. |

## Integrate

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `docker` | `command_run` | `building` | Building a container. |
| `ssh` | `command_run` | `running` | Connecting over SSH. |
| `api` | `web_fetch` | `web` | Calling an API. |
| `webhook` | `web_fetch` | `web` | Handling a webhook. |
| `query` | `command_run` | `searching` | Querying the database. |
| `report` | `file_create` | `typing` | Writing a report. |
| `embed` | `tool_call` | `thinking` | Computing embeddings. |
| `evaluate` | `thinking` | `thinking` | Evaluating the options. |
| `loop` | `command_run` | `running` | Looping over items. |
| `pipeline` | `command_run` | `building` | Running the pipeline. |

## Security

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `encrypt` | `tool_call` | `running` | Encrypting the data. |
| `decrypt` | `tool_call` | `running` | Decrypting the data. |
| `hash` | `tool_call` | `running` | Hashing the input. |
| `token` | `tool_call` | `running` | Issuing a token. |
| `login` | `tool_call` | `running` | Signing in. |
| `logout` | `tool_call` | `idle` | Signing out. |
| `validate` | `command_run` | `running` | Validating the input. |
| `sanitize` | `file_edit` | `typing` | Sanitizing the input. |
| `backup` | `command_run` | `building` | Backing up the data. |
| `restore` | `command_run` | `building` | Restoring from backup. |

## Infra

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `rollout` | `command_run` | `building` | Rolling out the change. |
| `scale` | `command_run` | `building` | Scaling the service. |
| `cluster` | `command_run` | `building` | Configuring the cluster. |
| `worker` | `subagent_spawned` | `spawning` | Starting a worker. |
| `proxy` | `command_run` | `running` | Setting up a proxy. |
| `tunnel` | `command_run` | `running` | Opening a tunnel. |
| `firewall` | `tool_call` | `running` | Configuring the firewall. |
| `dns` | `web_fetch` | `web` | Resolving DNS. |
| `health` | `command_run` | `running` | Checking health. |
| `trace` | `command_output` | `debugging` | Tracing the request. |

## Data

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `serialize` | `file_edit` | `typing` | Serializing the data. |
| `parse` | `tool_call` | `thinking` | Parsing the input. |
| `export` | `file_create` | `typing` | Exporting the data. |
| `import` | `file_read` | `reading` | Importing the data. |
| `zip` | `command_run` | `building` | Compressing files. |
| `unzip` | `command_run` | `building` | Extracting files. |
| `upload` | `web_fetch` | `web` | Uploading the data. |
| `sync` | `command_run` | `running` | Syncing the data. |
| `seed` | `command_run` | `building` | Seeding the database. |
| `archive` | `command_run` | `building` | Archiving the data. |

## Reason

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `classify` | `thinking` | `thinking` | Classifying the input. |
| `extract` | `thinking` | `thinking` | Extracting the details. |
| `rank` | `thinking` | `thinking` | Ranking the options. |
| `reflect` | `thinking` | `thinking` | Reflecting on the result. |
| `critique` | `thinking` | `thinking` | Critiquing the work. |
| `vote` | `thinking` | `thinking` | Casting a vote. |
| `consensus` | `thinking` | `thinking` | Reaching consensus. |
| `supervise` | `subagent_spawned` | `spawning` | Supervising the workers. |
| `learn` | `thinking` | `thinking` | Learning from feedback. |
| `context` | `token_usage` | `thinking` | Curating the context. |

## Events

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `throttle` | `command_run` | `running` | Throttling the rate. |
| `subscribe` | `tool_call` | `running` | Subscribing to events. |
| `publish` | `tool_call` | `running` | Publishing an event. |
| `email` | `web_fetch` | `web` | Sending an email. |
| `chat` | `message` | `thinking` | Chatting with you. |
| `render` | `command_run` | `building` | Rendering the UI. |
| `transpile` | `command_run` | `building` | Transpiling the code. |
| `shim` | `file_edit` | `typing` | Adding a shim. |
| `treeshake` | `command_run` | `building` | Tree-shaking the bundle. |
| `dedupe` | `command_run` | `building` | Removing duplicates. |

## Database

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `provision` | `command_run` | `building` | Provisioning infra. |
| `terraform` | `command_run` | `building` | Applying infrastructure. |
| `vacuum` | `command_run` | `running` | Vacuuming the database. |
| `reindex` | `command_run` | `building` | Rebuilding the index. |
| `shard` | `command_run` | `building` | Sharding the database. |
| `replicate` | `command_run` | `building` | Replicating the data. |
| `failover` | `command_run` | `running` | Failing over. |
| `loadtest` | `command_run` | `running` | Load testing. |
| `mock` | `file_edit` | `typing` | Mocking a dependency. |
| `stub` | `file_edit` | `typing` | Stubbing a function. |

## Testing

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `spy` | `command_run` | `running` | Spying on a call. |
| `assert` | `command_run` | `running` | Asserting a result. |
| `fuzz` | `command_run` | `running` | Fuzzing the inputs. |
| `e2e` | `command_run` | `running` | Running end-to-end tests. |
| `a11y` | `command_run` | `running` | Checking accessibility. |
| `i18n` | `file_edit` | `typing` | Localizing the strings. |
| `score` | `command_run` | `running` | Scoring the quality. |
| `regex` | `search` | `searching` | Matching a pattern. |
| `hotreload` | `command_run` | `running` | Hot reloading. |
| `lazyload` | `file_edit` | `typing` | Lazy loading a module. |

## Frontend

| Action | Event | Pixie state | Caption |
| --- | --- | --- | --- |
| `theme` | `file_edit` | `typing` | Theming the UI. |
| `animate` | `file_edit` | `typing` | Animating the UI. |
| `style` | `file_edit` | `typing` | Styling the UI. |
| `layout` | `file_edit` | `typing` | Laying out the UI. |
| `responsive` | `file_edit` | `typing` | Making it responsive. |
| `optimize` | `command_run` | `building` | Optimizing assets. |
| `preload` | `file_edit` | `typing` | Preloading resources. |
| `prefetch` | `web_fetch` | `web` | Prefetching data. |
| `cdn` | `web_fetch` | `web` | Configuring the CDN. |
| `dashboard` | `file_create` | `typing` | Building a dashboard. |

