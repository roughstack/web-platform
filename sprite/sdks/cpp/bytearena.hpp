// bytearena.hpp - C++ binding for ByteArena solutions.
//
// A solution is a normal program. Subclass Solution, override one or two
// methods, hand it to run, and never think about the wire format:
//
//     #include "bytearena.hpp"
//
//     class Greedy : public bytearena::Solution {
//      public:
//       std::string name() const override { return "greedy"; }
//
//       int select_victim(const bytearena::Stats& s) override {
//         auto best = std::max_element(
//             s.blocks.begin(), s.blocks.end(),
//             [](auto& a, auto& b) { return a.invalid < b.invalid; });
//         return best->index;
//       }
//     };
//
//     int main() { Greedy g; return bytearena::run(g); }
//
// This wraps the C binding rather than reimplementing it, so both languages
// share one JSON parser and one set of protocol bugs to fix. Build with
// bytearena.c alongside your solution.
//
// Printing is safe. The protocol owns stdout, so a stray std::cout would
// corrupt it. run points file descriptor 1 at stderr on entry and keeps the
// real stdout privately, so printing lands in the arena's Console tab and never
// affects your score.

#ifndef BYTEARENA_HPP
#define BYTEARENA_HPP

#include "bytearena.h"

#include <cstring>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace bytearena {

/// One block's occupancy, copied fresh for every request.
struct Block {
    int index = 0;
    int valid = 0;
    int invalid = 0;
    int free = 0;
    int erase_count = 0;
    /// True for reserved blocks that host writes never target. Reclaiming one
    /// shrinks the migration reserve, which is nearly always a mistake.
    bool is_over_provision = false;
};

/// The whole-device view handed to select_victim.
struct Stats {
    std::vector<Block> blocks;
    int pages_per_block = 0;
    int total_erases = 0;
    int free_pages = 0;
    int valid_pages = 0;
    int invalid_pages = 0;
};

/// Geometry announced once, before any work arrives.
struct Config {
    int blocks = 0;
    int pages_per_block = 0;
    int over_provision_blocks = 0;
    int slot_count = 0;
};

/// A move of a live value from one slot to another.
using Move = std::pair<int, int>;

/// Base class for a solution. Override whichever method the challenge needs.
class Solution {
public:
    virtual ~Solution() = default;

    /// Short identifier for the strategy. Shows up in results and on the
    /// leaderboard, so describe the strategy rather than yourself.
    virtual std::string name() const { return "solution"; }

    /// Called once with the geometry before any work arrives, which is the
    /// moment to size your own bookkeeping.
    virtual void setup(const Config&) {}

    /// Return the index of the block to reclaim.
    ///
    /// Called whenever the device is running out of space. The harness migrates
    /// the chosen block's live pages and erases it, so choosing a block full of
    /// live data is legal but expensive: every page in it has to be rewritten
    /// somewhere else.
    virtual int select_victim(const Stats&) {
        throw std::logic_error("this challenge needs select_victim to be overridden");
    }

    /// Return the moves that gather live values into the front of the array.
    /// Each entry of slots is the value living there, or -1 for an empty slot.
    virtual std::vector<Move> compact(const std::vector<int>&) {
        throw std::logic_error("this challenge needs compact to be overridden");
    }
};

/// Write a line to the console. Same as printing to std::cerr.
inline void log(const std::string& message) { ba_log("%s", message.c_str()); }

namespace detail {

inline int select_victim_bridge(const ba_stats* raw, void* user) {
    auto* solution = static_cast<Solution*>(user);

    Stats stats;
    stats.blocks.reserve(static_cast<std::size_t>(raw->block_count));
    for (int i = 0; i < raw->block_count; ++i) {
        Block b;
        b.index = raw->blocks[i].index;
        b.valid = raw->blocks[i].valid;
        b.invalid = raw->blocks[i].invalid;
        b.free = raw->blocks[i].free;
        b.erase_count = raw->blocks[i].erase_count;
        b.is_over_provision = raw->blocks[i].is_over_provision != 0;
        stats.blocks.push_back(b);
    }
    stats.pages_per_block = raw->pages_per_block;
    stats.total_erases = raw->total_erases;
    stats.free_pages = raw->free_pages;
    stats.valid_pages = raw->valid_pages;
    stats.invalid_pages = raw->invalid_pages;

    // An exception escaping into C is undefined behaviour, so it stops here and
    // becomes a console message and an obviously invalid answer.
    try {
        return solution->select_victim(stats);
    } catch (const std::exception& e) {
        ba_log("bytearena: select_victim threw: %s", e.what());
        return -1;
    } catch (...) {
        ba_log("bytearena: select_victim threw an unknown exception");
        return -1;
    }
}

inline void compact_bridge(const int* slots, int slot_count, ba_emitter* out, void* user) {
    auto* solution = static_cast<Solution*>(user);
    std::vector<int> values(slots, slots + slot_count);

    try {
        for (const auto& move : solution->compact(values)) {
            ba_emit_move(out, move.first, move.second);
        }
    } catch (const std::exception& e) {
        ba_log("bytearena: compact threw: %s", e.what());
    } catch (...) {
        ba_log("bytearena: compact threw an unknown exception");
    }
}

inline void setup_bridge(const ba_config* raw, void* user) {
    auto* solution = static_cast<Solution*>(user);
    Config config;
    config.blocks = raw->blocks;
    config.pages_per_block = raw->pages_per_block;
    config.over_provision_blocks = raw->over_provision_blocks;
    config.slot_count = raw->slot_count;
    try {
        solution->setup(config);
    } catch (const std::exception& e) {
        ba_log("bytearena: setup threw: %s", e.what());
    }
}

}  // namespace detail

/// Serve requests until the harness is done. Returns a process exit code.
inline int run(Solution& solution) {
    // The name has to outlive the call, since the C layer keeps the pointer.
    static std::string name;
    name = solution.name();

    ba_solution c_solution;
    std::memset(&c_solution, 0, sizeof(c_solution));
    c_solution.name = name.c_str();
    c_solution.select_victim = &detail::select_victim_bridge;
    c_solution.compact = &detail::compact_bridge;
    c_solution.setup = &detail::setup_bridge;
    c_solution.user = &solution;

    return ba_run(c_solution);
}

}  // namespace bytearena

#endif  // BYTEARENA_HPP
