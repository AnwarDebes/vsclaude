# @vsclaude/plugin-sdk roadmap

The current package is the pure logic layer. Planned follow up work:

## React and native integration
- Render registered `PanelDefinition` contributions into the IDE layout.
- Mount registered `VisualizationDefinition` contributions in the pixel-art view.
- Surface registered `Theme` contributions in the live theme picker.
- Bridge registered `PixieStateDefinition` contributions into the pixie state machine.

## Loading and isolation
- Load plugins from disk or a registry with manifest verification.
- Sandbox plugin activation so a misbehaving plugin cannot stall the host.
- Hot reload: unload and re-register a plugin in place during development.

## Provider lifecycle
- Wire registered `ProviderAdapter` contributions into the agent event stream.
- Surface provider capabilities and permission requests to the host UI.

## Diagnostics
- Structured activation logs and timing.
- A host inspector listing every plugin and its live contributions.
