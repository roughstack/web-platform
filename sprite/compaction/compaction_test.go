package compaction

import (
	"strings"
	"testing"
)

func liveCount(slots []int) int {
	n := 0
	for _, v := range slots {
		if v != Empty {
			n++
		}
	}
	return n
}

// optimalMoves is the strategy the optimum is defined by: pair each live value
// sitting past the prefix with an empty slot inside it.
func optimalMoves(slots []int) [][2]int {
	live := liveCount(slots)

	var holes []int
	for i := 0; i < live; i++ {
		if slots[i] == Empty {
			holes = append(holes, i)
		}
	}

	var moves [][2]int
	next := 0
	for i := live; i < len(slots); i++ {
		if slots[i] == Empty {
			continue
		}
		moves = append(moves, [2]int{i, holes[next]})
		next++
	}
	return moves
}

func TestGenerateIsDeterministic(t *testing.T) {
	cfg := Config{Seed: 7, Slots: 64, LiveFraction: 0.6}

	first, second := Generate(cfg), Generate(cfg)
	for i := range first {
		if first[i] != second[i] {
			t.Fatalf("the same seed produced different arrays at slot %d: %d vs %d",
				i, first[i], second[i])
		}
	}

	// Grading is only fair if two people face the same instance, so a changed
	// seed must actually change it.
	other := Generate(Config{Seed: 8, Slots: 64, LiveFraction: 0.6})
	same := true
	for i := range first {
		if first[i] != other[i] {
			same = false
			break
		}
	}
	if same {
		t.Error("two different seeds produced the same array")
	}
}

func TestGenerateAlwaysLeavesRoomToWork(t *testing.T) {
	// A fully packed or fully empty array teaches nothing, so the generator
	// must refuse to produce one whatever it is asked for.
	for _, fraction := range []float64{-1, 0, 0.0001, 0.5, 0.9999, 1, 2} {
		slots := Generate(Config{Seed: 1, Slots: 32, LiveFraction: fraction})
		live := liveCount(slots)
		if live < 1 {
			t.Errorf("live fraction %v produced an empty array", fraction)
		}
		if live >= len(slots) {
			t.Errorf("live fraction %v produced a full array, leaving nowhere to move data", fraction)
		}
	}
}

func TestOptimalCountsOnlyMisplacedValues(t *testing.T) {
	cases := []struct {
		name  string
		slots []int
		want  int
	}{
		{"already compacted", []int{1, 2, 3, Empty, Empty}, 0},
		{"one value out of place", []int{1, 2, Empty, Empty, 3}, 1},
		// Three live values means the prefix is slots 0 to 2, and slot 2
		// already holds one, so only the two past the prefix must move.
		{"bunched at the back", []int{Empty, Empty, 1, 2, 3}, 2},
		{"every live value past the prefix", []int{Empty, Empty, Empty, 1, 2}, 2},
		{"interleaved", []int{1, Empty, 2, Empty, 3, Empty}, 1},
		{"nothing live", []int{Empty, Empty}, 0},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Optimal(c.slots); got != c.want {
				t.Errorf("Optimal = %d, want %d", got, c.want)
			}
		})
	}
}

func TestOptimalSolutionScoresPerfectly(t *testing.T) {
	slots := Generate(Config{Seed: 42, Slots: 128, LiveFraction: 0.55})

	result := Grade(slots, optimalMoves(slots))
	if !result.Passed {
		t.Fatalf("the optimal strategy was rejected: %s", result.Error)
	}
	if result.Moves != result.Optimal {
		t.Errorf("used %d moves but the optimum is %d", result.Moves, result.Optimal)
	}
	if result.Efficiency != 1 {
		t.Errorf("efficiency is %v, want 1", result.Efficiency)
	}
}

func TestWastefulSolutionStillPassesButScoresLower(t *testing.T) {
	slots := []int{Empty, 1, Empty, 2}
	// Compacts correctly, but parks a value in a slot it has to leave again.
	moves := [][2]int{{1, 0}, {3, 2}, {2, 1}}

	result := Grade(slots, moves)
	if !result.Passed {
		t.Fatalf("a correct but wasteful answer should still pass, got: %s", result.Error)
	}
	if result.Efficiency >= 1 {
		t.Errorf("efficiency is %v, but extra moves should score below 1", result.Efficiency)
	}
}

func TestDoingNothingToACompactedArrayIsPerfect(t *testing.T) {
	result := Grade([]int{1, 2, Empty, Empty}, nil)
	if !result.Passed {
		t.Fatalf("an already compacted array needs no moves, got: %s", result.Error)
	}
	if result.Efficiency != 1 {
		t.Errorf("efficiency is %v, want 1", result.Efficiency)
	}
}

func TestChurningACompactedArrayScoresBelowPerfect(t *testing.T) {
	result := Grade([]int{1, 2, Empty, Empty}, [][2]int{{1, 2}, {2, 1}})
	if !result.Passed {
		t.Fatalf("the array ends up compacted, so it should pass, got: %s", result.Error)
	}
	if result.Efficiency >= 1 {
		t.Errorf("efficiency is %v, but needless moves should score below 1", result.Efficiency)
	}
}

func TestIllegalMovesAreRejectedWithSpecifics(t *testing.T) {
	cases := []struct {
		name      string
		slots     []int
		moves     [][2]int
		wantParts []string
	}{
		{
			name:      "source outside the array",
			slots:     []int{1, Empty},
			moves:     [][2]int{{9, 1}},
			wantParts: []string{"slot 9", "outside the array"},
		},
		{
			name:      "destination outside the array",
			slots:     []int{1, Empty},
			moves:     [][2]int{{0, 9}},
			wantParts: []string{"slot 9", "outside the array"},
		},
		{
			name:      "source is empty",
			slots:     []int{Empty, 1},
			moves:     [][2]int{{0, 1}},
			wantParts: []string{"slot 0", "is empty"},
		},
		{
			name:      "destination is occupied",
			slots:     []int{1, 2, Empty},
			moves:     [][2]int{{0, 1}},
			wantParts: []string{"slot 1", "would lose data"},
		},
		{
			name:      "move onto itself",
			slots:     []int{1, Empty},
			moves:     [][2]int{{0, 0}},
			wantParts: []string{"onto itself"},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			result := Grade(c.slots, c.moves)
			if result.Passed {
				t.Fatal("expected the attempt to be rejected")
			}
			for _, part := range c.wantParts {
				if !strings.Contains(result.Error, part) {
					t.Errorf("error should mention %q, got: %s", part, result.Error)
				}
			}
		})
	}
}

func TestLeavingTheArrayUncompactedFails(t *testing.T) {
	// Legal moves that shuffle without ever compacting.
	result := Grade([]int{Empty, 1, Empty, 2}, [][2]int{{1, 0}})
	if result.Passed {
		t.Fatal("an array that is still fragmented should not pass")
	}
	if !strings.Contains(result.Error, "slot 1") {
		t.Errorf("error should point at the first slot that is wrong, got: %s", result.Error)
	}
}

func TestDoingNothingToAFragmentedArrayFails(t *testing.T) {
	result := Grade([]int{Empty, 1}, nil)
	if result.Passed {
		t.Fatal("an untouched fragmented array should not pass")
	}
}
