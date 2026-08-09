/* bytearena.h - C binding for ByteArena solutions.
 *
 * A solution is a normal program. Fill in a ba_solution, hand it to ba_run,
 * and never think about the wire format:
 *
 *     #include "bytearena.h"
 *
 *     static int select_victim(const ba_stats *s, void *user) {
 *         (void)user;
 *         int best = -1, most = -1;
 *         for (int i = 0; i < s->block_count; i++) {
 *             if (s->blocks[i].invalid > most) {
 *                 most = s->blocks[i].invalid;
 *                 best = s->blocks[i].index;
 *             }
 *         }
 *         return best;
 *     }
 *
 *     int main(void) {
 *         ba_solution sol = {0};
 *         sol.name = "greedy";
 *         sol.select_victim = select_victim;
 *         return ba_run(sol);
 *     }
 *
 * Printing is safe. The protocol owns stdout, so a stray printf would corrupt
 * it. Rather than forbid printing, ba_run points file descriptor 1 at stderr on
 * entry and keeps the real stdout privately for protocol traffic. Print however
 * you like; it appears in the arena's Console tab and never affects your score.
 */

#ifndef BYTEARENA_H
#define BYTEARENA_H

#ifdef __cplusplus
extern "C" {
#endif

/* Protocol revision this SDK speaks. */
#define BA_VERSION 1

/* One block's occupancy, copied fresh for every request. */
typedef struct {
    int index;
    int valid;
    int invalid;
    int free;
    int erase_count;
    /* Non-zero for reserved blocks that host writes never target. Reclaiming
     * one shrinks the migration reserve, which is nearly always a mistake. */
    int is_over_provision;
} ba_block;

/* The whole-device view handed to select_victim. */
typedef struct {
    const ba_block *blocks;
    int block_count;
    int pages_per_block;
    int total_erases;
    int free_pages;
    int valid_pages;
    int invalid_pages;
} ba_stats;

/* Geometry announced once, before any work arrives. */
typedef struct {
    int blocks;
    int pages_per_block;
    int over_provision_blocks;
    int slot_count;
} ba_config;

/* Opaque sink for compaction moves. */
typedef struct ba_emitter ba_emitter;

/* Record one move of a live value from one slot to another. Call in the order
 * the moves should be applied. */
void ba_emit_move(ba_emitter *out, int from, int to);

/* A solution. Implement whichever callback the challenge calls for; leave the
 * other NULL. user is passed straight through and is never inspected. */
typedef struct {
    /* Short identifier for the strategy. Shows up in results and on the
     * leaderboard, so describe the strategy rather than yourself. */
    const char *name;

    /* Return the index of the block to reclaim.
     *
     * Called whenever the device is running out of space. The harness migrates
     * the chosen block's live pages and erases it, so choosing a block full of
     * live data is legal but expensive: every page in it has to be rewritten
     * somewhere else. */
    int (*select_victim)(const ba_stats *stats, void *user);

    /* Emit the moves that gather live values into the front of the array.
     * Each entry of slots is the value living there, or -1 for an empty slot. */
    void (*compact)(const int *slots, int slot_count, ba_emitter *out, void *user);

    /* Optional. Called once with the geometry before any work arrives, which is
     * the moment to size your own bookkeeping. */
    void (*setup)(const ba_config *config, void *user);

    void *user;
} ba_solution;

/* Write a line to the console. Same as printing; kept because it reads more
 * deliberately at a call site you intend to leave in. */
void ba_log(const char *fmt, ...);

/* Serve requests until the harness is done. Returns a process exit code. */
int ba_run(ba_solution solution);

#ifdef __cplusplus
}
#endif

#endif /* BYTEARENA_H */
