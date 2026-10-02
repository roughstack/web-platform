/**
 * Loads every pack.
 *
 * Registration happens as an import side effect, so anything that renders
 * content blocks imports this module first. Adding a domain is one line here
 * plus its folder — no core file changes shape.
 */

import "./ssd";
import "./systems";

export { getIllustration, getInterface, getPackBlock, registeredIllustrations, registeredPackBlocks } from "./registry";
