// Hand-authored on purpose. @lovable.dev/mcp-js ships a Vite plugin that emits
// this file, but its path check compares a POSIX project root against a
// Windows resolve() result and throws on win32 — so the route is owned here
// instead. It is the plugin's own template: keep it in sync if the SDK changes.
// route: /mcp
import { createFileRoute } from "@tanstack/react-router";

import { createTanStackMcpHandler } from "@lovable.dev/mcp-js/stacks/tanstack";

import mcp from "../lib/mcp/index";

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      ANY: createTanStackMcpHandler(mcp, {
        resourcePath: "/mcp",
      }),
    },
  },
});
