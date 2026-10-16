/** Generic visual primitives shared by every systems challenge. */

import { registerIllustration } from "../registry";
import { BudgetDiagram, ExchangeDiagram, FrameDiagram, RangeDiagram, SnapshotDiagram } from "./concept-illustrations";
import { FlowDiagram, StateDiagram, TimelineDiagram } from "./illustrations";
import { JournalRecoveryStory, LsmOverlapStory, StreamWatermarkStory } from "./recovery-time-stories";
import { CacheStory, LostAckStory } from "./story-illustrations";
import { ChunkReadStory, SchedulerStory, QueueLeaseStory, TokenGateStory } from "./work-stories";

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
registerIllustration("systems.journal-story", JournalRecoveryStory);
registerIllustration("systems.lsm-story", LsmOverlapStory);
registerIllustration("systems.window-story", StreamWatermarkStory);
registerIllustration("systems.chunk-story", ChunkReadStory);
registerIllustration("systems.scheduler-story", SchedulerStory);
registerIllustration("systems.queue-story", QueueLeaseStory);
registerIllustration("systems.gate-story", TokenGateStory);
