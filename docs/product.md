Rough Stack: a systems internals learning platform
The Vision:
The software engineering interview and learning ecosystem is saturated with tools for practicing algorithmic problems or basic frontend components. Few platforms let engineers write and execute code for low-level systems challenges such as balancing an LSM tree, writing a wear-leveling policy for an SSD, or implementing a write-ahead log. Rough Stack is built for that gap.

Product Description:
Rough Stack is an interactive, browser-based coding platform and secure evaluation engine for backend and systems engineering challenges. It turns complex hardware and database internals into focused, programmable exercises.

Users select a challenge, write a solution in the embedded editor, and run it against a deterministic workload. The production architecture uses isolated, ephemeral execution environments. A solution is injected into a fresh environment, exercised against realistic traffic, scored on behavior such as write amplification or tail latency, and then discarded.

Core Differentiators & MVP Features:

True Ephemeral Execution: Leverages Fly.io's sub-300ms boot times to provide instant code evaluation without the massive infrastructure overhead of traditional Docker-based sandboxes.

Systems-Level Puzzles: Shifts the focus from arbitrary math puzzles to real-world engineering constraints (memory fragmentation, network partitions, disk I/O optimization).

The Adversarial Engine: The backend test runner doesn't just check for standard output; it injects simulated hardware faults (like a sudden node crash) to ensure the user's logic is actually resilient.

Visual Performance Metrics: Returns not just a "Pass/Fail," but a detailed breakdown of the user's algorithmic efficiency (e.g., how many unnecessary block erases their FTL algorithm triggered).

The Goal:
Build a credible systems portfolio and a practical understanding of internals. Rough Stack demonstrates secure execution, distributed orchestration, responsive product engineering, and the tradeoffs inside databases, storage engines, and operating systems.

Are these descriptions hitting the exact target you have in your head for the weekend project roadmap?
