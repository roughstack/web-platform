/**
 * The SSD pack: everything the storage-internals ladder contributes.
 *
 * Importing this module registers it. The core renderer resolves illustrations
 * and signatures through the registry and never imports anything from here, so
 * a second pack — LSM trees, write-ahead logs — is a sibling folder and one
 * more import in packs/index.ts.
 */

import { LANGUAGE_IDS } from "@/lib/languages";
import { registerIllustration, registerInterface } from "../registry";
import { BlockGrid } from "./illustrations/block-grid";
import { EfficiencyDial, WearHistogram, WriteAmpBar } from "./illustrations/metrics";
import { SlotStrip } from "./illustrations/slot-strip";
import { SSD_INTERFACES } from "./interfaces";

export const PACK_ID = "ssd";

registerIllustration("ssd.slotStrip", SlotStrip);
registerIllustration("ssd.blockGrid", BlockGrid);
registerIllustration("ssd.writeAmpBar", WriteAmpBar);
registerIllustration("ssd.wearHistogram", WearHistogram);
registerIllustration("ssd.efficiencyDial", EfficiencyDial);

for (const [task, snippets] of Object.entries(SSD_INTERFACES)) {
  for (const language of LANGUAGE_IDS) {
    registerInterface(task, language, snippets[language]);
  }
}
