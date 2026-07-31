Product 3: ByteArena (System Internals Puzzle Evaluator)
The Vision:
The software engineering interview and learning ecosystem is saturated with tools for practicing algorithmic LeetCode problems or basic frontend components. However, there is no platform that allows senior engineers to actually write and execute code for low-level system design challenges—like balancing an LSM-tree, writing a naive wear-leveling algorithm for an SSD, or implementing a custom Write-Ahead Log. ByteArena bridges this gap.

Product Description:
ByteArena is an interactive, browser-based coding platform and secure evaluation engine tailored specifically for backend and systems engineering challenges. It abstracts complex hardware and database internals into programmable puzzles.

Users log into the Next.js frontend, select a challenge (e.g., "Implement a Garbage Collector for this 10x10 Flash Memory Matrix"), and write their solution in Go or Python using an embedded Monaco editor. When they hit "Execute," the true power of ByteArena takes over. The platform utilizes Fly.io's ephemeral Machines API to instantly boot a secure, isolated microVM (a "Sprite"). The user's code is injected into this VM, executed against a massive synthetic workload (simulating thousands of reads/writes), scored for performance (e.g., measuring Write Amplification), and then the VM is instantly destroyed.

Core Differentiators & MVP Features:

True Ephemeral Execution: Leverages Fly.io's sub-300ms boot times to provide instant code evaluation without the massive infrastructure overhead of traditional Docker-based sandboxes.

Systems-Level Puzzles: Shifts the focus from arbitrary math puzzles to real-world engineering constraints (memory fragmentation, network partitions, disk I/O optimization).

The Adversarial Engine: The backend test runner doesn't just check for standard output; it injects simulated hardware faults (like a sudden node crash) to ensure the user's logic is actually resilient.

Visual Performance Metrics: Returns not just a "Pass/Fail," but a detailed breakdown of the user's algorithmic efficiency (e.g., how many unnecessary block erases their FTL algorithm triggered).

The Goal:
To build a portfolio centerpiece that screams "Principal Engineer." ByteArena proves you can architect secure, distributed cloud orchestration (using Fly Machines as an API), build responsive full-stack web applications, and possess a deep, authoritative understanding of database and storage internals.

Are these descriptions hitting the exact target you have in your head for the weekend project roadmap?