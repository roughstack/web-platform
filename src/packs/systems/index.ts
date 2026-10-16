/** Generic visual primitives shared by every systems challenge. */

import { registerIllustration } from "../registry";
import { BudgetDiagram, ExchangeDiagram, FrameDiagram, RangeDiagram, SnapshotDiagram } from "./concept-illustrations";
import { FlowDiagram, StateDiagram, TimelineDiagram } from "./illustrations";
import { CacheStory, LostAckStory } from "./story-illustrations";

registerIllustration("systems.flow", FlowDiagram);
registerIllustration("systems.state", StateDiagram);
registerIllustration("systems.timeline", TimelineDiagram);
registerIllustration("systems.snapshot", SnapshotDiagram);
registerIllustration("systems.budget", BudgetDiagram);
registerIllustration("systems.frames", FrameDiagram);
registerIllustration("systems.ranges", RangeDiagram);
registerIllustration("systems.exchange", ExchangeDiagram);
registerIllustration("systems.cache-story", CacheStory);
registerIllustration("systems.lost-ack-story", LostAckStory);
