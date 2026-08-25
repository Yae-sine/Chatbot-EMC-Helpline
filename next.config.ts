import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` otherwise appends a block to AGENTS.md on every start. That file
  // carries the project's binding rules (crisis protocol, content rules) and is
  // not Next's to edit — see AGENTS.md's own "do not modify" preamble.
  agentRules: false,
};

export default nextConfig;
