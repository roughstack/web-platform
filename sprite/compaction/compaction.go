// Package compaction is the entry rung of the ladder: a flat array of slots,
// some holding live values and some dead, compacted into the front.
//
// It exists to teach one thing before any flash vocabulary appears: moving data
// is not free. That is write amplification, stripped of blocks, erases and
// wear, and it is the idea every later rung builds on.
//
// Unlike the upper rungs this task has a provable optimum, so a solution is
// scored against the best possible answer rather than ranked against other
// people. If m live values sit outside the target prefix, then the prefix must
// contain exactly m empty slots, every one of those m values has to move at
// least once, and moving each into a distinct empty prefix slot achieves it. So
// the optimum is exactly m, and there is a right answer to converge on.
package compaction

import (
	"errors"
	"fmt"
	"math/rand"
)

// Empty marks a slot that holds no live value.
const Empty = -1

// Config describes one generated instance.
type Config struct {
	Seed int64
	// Slots is the length of the array.
	Slots int
	// LiveFraction is roughly how much of the array holds live data. It is
	// clamped so an instance always has at least one live value and at least
	// one empty slot, since neither degenerate case teaches anything.
	LiveFraction float64
}

// Result is the outcome of grading one attempt.
type Result struct {
	// InitialSlots is the instance the solution was given, kept so the arena
	// can draw the before and after states.
	InitialSlots []int `json:"initial_slots"`
	FinalSlots   []int `json:"final_slots"`

	LiveValues int `json:"live_values"`
	// Moves is how many moves the solution used, and Optimal is the fewest that
	// could possibly work.
	Moves   int `json:"moves"`
	Optimal int `json:"optimal"`
	// Efficiency is Optimal/Moves, so 1.0 is a perfect answer.
	Efficiency float64 `json:"efficiency"`

	Passed bool   `json:"passed"`
	Error  string `json:"error,omitempty"`
}

// Generate builds an instance. The same seed always produces the same array, so
// two solutions can be compared.
func Generate(cfg Config) []int {
	if cfg.Slots < 2 {
		cfg.Slots = 2
	}

	live := int(float64(cfg.Slots) * cfg.LiveFraction)
	if live < 1 {
		live = 1
	}
	if live > cfg.Slots-1 {
		live = cfg.Slots - 1
	}

	slots := make([]int, cfg.Slots)
	for i := range slots {
		slots[i] = Empty
	}

	// Scatter the live values across distinct positions. Using a permutation
	// rather than rejection sampling keeps the generator's cost independent of
	// how full the array is.
	rng := rand.New(rand.NewSource(cfg.Seed))
	positions := rng.Perm(cfg.Slots)[:live]
	for value, pos := range positions {
		// Values start at 1 so that a solution cannot accidentally pass by
		// confusing a value with the Empty sentinel.
		slots[pos] = value + 1
	}

	return slots
}

// Optimal returns the fewest moves that can compact the array: the number of
// live values sitting outside the prefix they must end up in.
func Optimal(slots []int) int {
	live := 0
	for _, v := range slots {
		if v != Empty {
			live++
		}
	}

	misplaced := 0
	for i, v := range slots {
		if v != Empty && i >= live {
			misplaced++
		}
	}
	return misplaced
}

// Grade applies a solution's moves to the instance and checks the result.
//
// The rules are deliberately strict, and each rejection names the specific slot
// involved, because "your answer was wrong" teaches nothing when the array is a
// thousand entries long.
func Grade(initial []int, moves [][2]int) Result {
	slots := make([]int, len(initial))
	copy(slots, initial)

	live := 0
	for _, v := range initial {
		if v != Empty {
			live++
		}
	}

	result := Result{
		InitialSlots: initial,
		LiveValues:   live,
		Optimal:      Optimal(initial),
	}

	applied, err := apply(slots, moves)
	if err != nil {
		// Moves reports how many moves were actually applied before the
		// rejection, not how many the solution returned. A solution that
		// returns 66 moves but fails on the first one used zero: nothing
		// was compacted. Reporting len(moves) here would make the metrics
		// table show "moves=66, optimal=66" next to a Failed pill, which
		// looks like a perfect score and is the opposite of what happened.
		result.Moves = applied
		result.FinalSlots = slots
		result.Error = err.Error()
		return result
	}

	result.Moves = applied

	if err := checkCompacted(initial, slots, live); err != nil {
		result.FinalSlots = slots
		result.Error = err.Error()
		return result
	}

	result.FinalSlots = slots
	result.Passed = true
	result.Efficiency = efficiency(result.Optimal, result.Moves)
	return result
}

// apply replays the moves, rejecting any that is not physically meaningful.
// It returns the number of moves successfully applied before any rejection (or
// len(moves) if all succeeded), so the caller can report how much work was
// actually done rather than how much was attempted.
func apply(slots []int, moves [][2]int) (int, error) {
	for i, move := range moves {
		from, to := move[0], move[1]

		if from < 0 || from >= len(slots) {
			return i, fmt.Errorf("move %d reads slot %d, which is outside the array (0 to %d)",
				i, from, len(slots)-1)
		}
		if to < 0 || to >= len(slots) {
			return i, fmt.Errorf("move %d writes slot %d, which is outside the array (0 to %d)",
				i, to, len(slots)-1)
		}
		if from == to {
			return i, fmt.Errorf("move %d moves slot %d onto itself, which does nothing but still costs a write",
				i, from)
		}
		if slots[from] == Empty {
			return i, fmt.Errorf("move %d reads slot %d, which is empty", i, from)
		}
		if slots[to] != Empty {
			return i, fmt.Errorf("move %d writes slot %d, which already holds value %d; overwriting it would lose data",
				i, to, slots[to])
		}

		slots[to] = slots[from]
		slots[from] = Empty
	}
	return len(moves), nil
}

// checkCompacted verifies the array ends up compacted with nothing lost.
func checkCompacted(initial, final []int, live int) error {
	for i := 0; i < live; i++ {
		if final[i] == Empty {
			return fmt.Errorf(
				"slot %d is empty but should hold live data: %d live values must end up in slots 0 to %d",
				i, live, live-1)
		}
	}
	for i := live; i < len(final); i++ {
		if final[i] != Empty {
			return fmt.Errorf(
				"slot %d still holds value %d, but everything should be packed into slots 0 to %d",
				i, final[i], live-1)
		}
	}

	// Compaction moves data; it never invents or destroys it.
	if err := sameContents(initial, final); err != nil {
		return err
	}
	return nil
}

func sameContents(initial, final []int) error {
	seen := make(map[int]int, len(initial))
	for _, v := range initial {
		if v != Empty {
			seen[v]++
		}
	}
	for _, v := range final {
		if v == Empty {
			continue
		}
		seen[v]--
		if seen[v] < 0 {
			return fmt.Errorf("value %d appears more times at the end than it did at the start", v)
		}
	}
	for value, remaining := range seen {
		if remaining > 0 {
			return fmt.Errorf("value %d was lost", value)
		}
	}
	return nil
}

// efficiency scores an answer against the optimum.
//
// An instance that is already compacted has an optimum of zero. Any solution
// that also does nothing is perfect; one that shuffles data around anyway is
// not, and is scored by how much needless work it did.
func efficiency(optimal, moves int) float64 {
	if optimal == 0 {
		if moves == 0 {
			return 1
		}
		return 1 / (1 + float64(moves))
	}
	if moves == 0 {
		return 0
	}
	return float64(optimal) / float64(moves)
}

// ErrNoMoves signals that a solution returned nothing for an instance that
// needed work, which is almost always an unimplemented method rather than a
// deliberate choice.
var ErrNoMoves = errors.New("compaction: the solution returned no moves")
