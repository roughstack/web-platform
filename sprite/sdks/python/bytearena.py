"""bytearena - Python binding for ByteArena solutions.

A solution is a normal program. Subclass ``Solution``, implement one or two
methods, call ``run``, and never think about the wire format::

    import bytearena as ba

    class Greedy(ba.Solution):
        name = "greedy"

        def select_victim(self, stats: ba.Stats) -> int:
            return max(stats.blocks, key=lambda b: b.invalid).index

    ba.run(Greedy())

Printing is safe
----------------
The protocol owns stdout, so a stray ``print`` would corrupt it. Rather than
forbid printing - the first thing anyone reaches for when debugging - ``run``
moves the real stdout out of the way on entry and points file descriptor 1 at
stderr. Print however you like; it appears in the arena's Console tab and never
affects your score.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field
from typing import List, Sequence, Tuple

__all__ = ["BlockStat", "Stats", "Solution", "run", "log", "VERSION"]

VERSION = 1

TASK_COMPACTION = "compaction"
TASK_VICTIM_SELECTION = "victim-selection"
TASK_WEAR_LEVELING = "wear-leveling"


@dataclass(frozen=True)
class BlockStat:
    """One block's occupancy, copied fresh for every request."""

    index: int
    valid: int
    invalid: int
    free: int
    erase_count: int
    #: Reserved blocks that host writes never target. Reclaiming one shrinks
    #: the migration reserve, which is nearly always a mistake.
    is_over_provision: bool

    @classmethod
    def _from_wire(cls, d: dict) -> "BlockStat":
        return cls(
            index=d.get("index", 0),
            valid=d.get("valid", 0),
            invalid=d.get("invalid", 0),
            free=d.get("free", 0),
            erase_count=d.get("eraseCount", 0),
            is_over_provision=bool(d.get("isOverProvision", False)),
        )


@dataclass(frozen=True)
class Stats:
    """The whole-device view handed to :meth:`Solution.select_victim`."""

    blocks: List[BlockStat] = field(default_factory=list)
    pages_per_block: int = 0
    total_erases: int = 0
    free_pages: int = 0
    valid_pages: int = 0
    invalid_pages: int = 0

    @classmethod
    def _from_wire(cls, d: dict) -> "Stats":
        return cls(
            blocks=[BlockStat._from_wire(b) for b in d.get("blocks", [])],
            pages_per_block=d.get("pagesPerBlock", 0),
            total_erases=d.get("totalErases", 0),
            free_pages=d.get("freePages", 0),
            valid_pages=d.get("validPages", 0),
            invalid_pages=d.get("invalidPages", 0),
        )


class Solution:
    """Base class for a solution.

    Set :attr:`name` to something that describes the strategy - it shows up in
    results and on the leaderboard. Then implement whichever method the
    challenge calls for.
    """

    #: Short identifier for the strategy.
    name: str = "solution"

    def select_victim(self, stats: Stats) -> int:
        """Return the index of the block to reclaim.

        Called whenever the device is running out of space. The harness
        migrates the chosen block's live pages and erases it, so choosing a
        block full of live data is legal but expensive: every page in it has to
        be rewritten somewhere else.
        """
        raise NotImplementedError

    def compact(self, slots: Sequence[int]) -> Sequence[Tuple[int, int]]:
        """Return the moves that gather live values into the front of ``slots``.

        Each entry of ``slots`` is the value living there, or ``-1`` for an
        empty slot. Moves are ``(from, to)`` pairs applied in order.
        """
        raise NotImplementedError


def log(message: object) -> None:
    """Write a line to the console. Equivalent to ``print``."""
    print(message, file=sys.stderr)


def _implements(solution: Solution, method: str) -> bool:
    """Report whether the subclass actually overrode a method."""
    return getattr(type(solution), method, None) is not getattr(Solution, method)


def _check_capability(solution: Solution, task: str) -> None:
    if task in (TASK_VICTIM_SELECTION, TASK_WEAR_LEVELING):
        if not _implements(solution, "select_victim"):
            raise RuntimeError("this challenge needs a select_victim(self, stats) method")
    elif task == TASK_COMPACTION:
        if not _implements(solution, "compact"):
            raise RuntimeError("this challenge needs a compact(self, slots) method")
    else:
        raise RuntimeError(f"unknown task {task!r}")


def _redirect_stdout_to_stderr():
    """Hand the real stdout to the protocol and point everything else at stderr.

    Duplicating file descriptor 1 onto 2 covers not just ``print`` but anything
    a C extension or subprocess writes directly, which a ``sys.stdout``
    reassignment alone would miss.
    """
    wire_fd = os.dup(1)
    os.dup2(2, 1)
    wire = os.fdopen(wire_fd, "w", encoding="utf-8", newline="\n")
    sys.stdout = sys.stderr
    return wire


def run(solution: Solution) -> None:
    """Connect a solution to the harness and serve requests until it is done."""
    wire = _redirect_stdout_to_stderr()

    def send(payload: dict) -> None:
        wire.write(json.dumps(payload, separators=(",", ":")) + "\n")
        wire.flush()

    def fail(message: str) -> None:
        send({"type": "error", "message": message})
        sys.stderr.write(f"bytearena: {message}\n")
        sys.exit(1)

    try:
        first = _read_message()
        if first is None:
            fail("the harness closed the connection before sending anything")
        if first.get("type") != "init":
            fail(f"expected an init request first, got {first.get('type')!r}")
        if first.get("v") != VERSION:
            fail(
                f"this SDK speaks protocol v{VERSION} but the harness speaks "
                f"v{first.get('v')}; the SDK is out of date"
            )

        try:
            _check_capability(solution, first.get("task", ""))
        except RuntimeError as exc:
            fail(str(exc))

        send({"type": "ready", "name": getattr(solution, "name", "solution")})

        while True:
            request = _read_message()
            # The harness closing the pipe without a done request means it gave
            # up on us, and it has already recorded why.
            if request is None:
                return

            kind = request.get("type")
            if kind == "done":
                return

            if kind == "reclaim":
                stats = Stats._from_wire(request.get("stats") or {})
                send({"type": "victim", "block": int(solution.select_victim(stats))})

            elif kind == "compact":
                moves = solution.compact(request.get("slots") or [])
                send({"type": "moves", "moves": [[int(a), int(b)] for a, b in moves]})

            else:
                fail(f"unknown request {kind!r}")

    except Exception as exc:  # surfaced to the author, not swallowed
        import traceback

        traceback.print_exc(file=sys.stderr)
        try:
            send({"type": "error", "message": f"{type(exc).__name__}: {exc}"})
        except Exception:
            pass
        sys.exit(1)


def _read_message():
    """Read one newline-delimited JSON message, skipping blank lines."""
    for line in sys.stdin:
        line = line.strip()
        if line:
            return json.loads(line)
    return None
