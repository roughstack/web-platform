/** Generic visual primitives shared by every systems challenge. */

import { registerIllustration } from "../registry";
import { FlowDiagram, StateDiagram, TimelineDiagram } from "./illustrations";

registerIllustration("systems.flow", FlowDiagram);
registerIllustration("systems.state", StateDiagram);
registerIllustration("systems.timeline", TimelineDiagram);
