// Package sdk is the Go binding for ByteArena solutions.
//
// A solution is a normal program. It implements one or two methods, calls
// Run, and never thinks about the wire format:
//
//	type Solution struct{}
//
//	func (Solution) Name() string { return "greedy" }
//
//	func (Solution) SelectVictim(s sdk.Stats) int {
//		best, most := -1, -1
//		for _, b := range s.Blocks {
//			if b.Invalid > most {
//				most, best = b.Invalid, b.Index
//			}
//		}
//		return best
//	}
//
//	func main() { sdk.Run(Solution{}) }
//
// # Printing is safe
//
// The protocol owns stdout, so a stray fmt.Println would corrupt it. Rather
// than forbid printing — which is the first thing anyone reaches for — Run
// rewires os.Stdout to stderr on entry and keeps the real stdout privately for
// protocol traffic. Print however you like; it shows up in the arena's Console
// tab and never affects your score.
package sdk

import (
	"fmt"
	"os"

	"github.com/bytearena/sprite/proto"
)

// Stats is the whole-device view handed to SelectVictim.
type Stats = proto.Stats

// BlockStat is one block's occupancy.
type BlockStat = proto.BlockStat

// Named is the one method every solution must provide. The name shows up in
// results and on the leaderboard, so it should describe the strategy rather
// than the author.
type Named interface {
	Name() string
}

// VictimSelector solves the victim-selection and wear-levelling tasks.
//
// SelectVictim is called whenever the device is running out of space. Return
// the index of the block to reclaim. The harness migrates that block's live
// pages and erases it, so returning a block full of live data is legal but
// expensive: every page in it has to be rewritten somewhere else.
type VictimSelector interface {
	Named
	SelectVictim(stats Stats) int
}

// Compactor solves the compaction task.
//
// Compact receives the slot array, where each entry is the value living in that
// slot or -1 for an empty one. Return the moves that gather the live values
// into the front of the array, as {from, to} pairs applied in order.
type Compactor interface {
	Named
	Compact(slots []int) [][2]int
}

// Log writes a line to the console. Equivalent to printing, and kept only
// because it reads more deliberately at a call site you intend to keep.
func Log(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
}

// Run connects a solution to the harness and serves requests until the harness
// says it is done. It does not return; it exits the process.
func Run(solution Named) {
	// Hand the real stdout to the protocol and point everything else at
	// stderr, so ordinary printing cannot corrupt the stream.
	wire := os.Stdout
	os.Stdout = os.Stderr

	if err := serve(solution, os.Stdin, wire); err != nil {
		fmt.Fprintf(os.Stderr, "bytearena: %v\n", err)
		os.Exit(1)
	}
	os.Exit(0)
}

// serve is the request loop, split out so tests can drive it over pipes.
func serve(solution Named, in *os.File, out *os.File) error {
	dec := proto.NewDecoder(in)
	enc := proto.NewEncoder(out)

	req, err := dec.DecodeRequest()
	if err != nil {
		return fmt.Errorf("could not read the init request: %w", err)
	}
	if req.Type != proto.KindInit {
		return fmt.Errorf("expected an init request first, got %q", req.Type)
	}
	if req.V != proto.Version {
		return fmt.Errorf(
			"this SDK speaks protocol v%d but the harness speaks v%d; the SDK is out of date",
			proto.Version, req.V,
		)
	}
	if err := checkCapability(solution, req.Task); err != nil {
		// Report the mismatch over the wire too, so the author sees it in the
		// results panel rather than only in the console.
		_ = enc.EncodeResponse(proto.Response{Type: proto.KindError, Message: err.Error()})
		return err
	}
	if err := enc.EncodeResponse(proto.Response{Type: proto.KindReady, Name: solution.Name()}); err != nil {
		return err
	}

	for {
		req, err := dec.DecodeRequest()
		if err != nil {
			// The harness closing the pipe without a done request means it gave
			// up on us, and it has already recorded why.
			return nil
		}

		switch req.Type {
		case proto.KindDone:
			return nil

		case proto.KindReclaim:
			selector, ok := solution.(VictimSelector)
			if !ok {
				return respondError(enc, "this solution does not implement SelectVictim")
			}
			stats := proto.Stats{}
			if req.Stats != nil {
				stats = *req.Stats
			}
			block := selector.SelectVictim(stats)
			if err := enc.EncodeResponse(proto.Response{Type: proto.KindVictim, Block: block}); err != nil {
				return err
			}

		case proto.KindCompact:
			compactor, ok := solution.(Compactor)
			if !ok {
				return respondError(enc, "this solution does not implement Compact")
			}
			moves := compactor.Compact(req.Slots)
			if moves == nil {
				moves = [][2]int{}
			}
			if err := enc.EncodeResponse(proto.Response{Type: proto.KindMoves, Moves: moves}); err != nil {
				return err
			}

		default:
			return respondError(enc, fmt.Sprintf("unknown request %q", req.Type))
		}
	}
}

// checkCapability fails fast when a solution cannot possibly answer the task it
// has been handed, so the author gets one clear sentence instead of a timeout.
func checkCapability(solution Named, task string) error {
	switch task {
	case proto.TaskVictimSelection, proto.TaskWearLeveling:
		if _, ok := solution.(VictimSelector); !ok {
			return fmt.Errorf("this challenge needs a SelectVictim(stats sdk.Stats) int method")
		}
	case proto.TaskCompaction:
		if _, ok := solution.(Compactor); !ok {
			return fmt.Errorf("this challenge needs a Compact(slots []int) [][2]int method")
		}
	default:
		return fmt.Errorf("unknown task %q", task)
	}
	return nil
}

func respondError(enc *proto.Encoder, msg string) error {
	_ = enc.EncodeResponse(proto.Response{Type: proto.KindError, Message: msg})
	return fmt.Errorf("%s", msg)
}
