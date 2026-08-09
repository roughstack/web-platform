/* bytearena.c - implementation of the C binding.
 *
 * Self-contained on purpose: the Sprite image builds solutions with no network
 * and no package manager, so this file carries its own JSON parser rather than
 * depending on one. The parser only has to survive input this SDK's own host
 * generates, but it is written as a complete little parser anyway, because
 * "only has to handle our input" is how parsers acquire security bugs.
 */

#define _POSIX_C_SOURCE 200809L

#include "bytearena.h"

#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/* ------------------------------------------------------------------ JSON */

typedef enum {
    BA_J_NULL,
    BA_J_BOOL,
    BA_J_NUM,
    BA_J_STR,
    BA_J_ARR,
    BA_J_OBJ
} ba_jtype;

typedef struct ba_json ba_json;

struct ba_json {
    ba_jtype type;
    double num;      /* BA_J_NUM, and 0/1 for BA_J_BOOL */
    char *str;       /* BA_J_STR */
    ba_json **items; /* BA_J_ARR elements, or BA_J_OBJ values */
    char **keys;     /* BA_J_OBJ keys, parallel to items */
    int count;
    int cap;
};

static void ba_json_free(ba_json *v) {
    if (!v) return;
    free(v->str);
    for (int i = 0; i < v->count; i++) {
        if (v->keys) free(v->keys[i]);
        ba_json_free(v->items[i]);
    }
    free(v->items);
    free(v->keys);
    free(v);
}

static ba_json *ba_json_new(ba_jtype type) {
    ba_json *v = (ba_json *)calloc(1, sizeof(ba_json));
    if (v) v->type = type;
    return v;
}

/* push appends a value, and a key when the container is an object. Ownership of
 * both transfers to the container. Returns 0 on allocation failure. */
static int ba_json_push(ba_json *container, char *key, ba_json *value) {
    if (container->count == container->cap) {
        int cap = container->cap ? container->cap * 2 : 8;
        ba_json **items = (ba_json **)realloc(container->items, (size_t)cap * sizeof(*items));
        if (!items) return 0;
        container->items = items;
        if (container->type == BA_J_OBJ) {
            char **keys = (char **)realloc(container->keys, (size_t)cap * sizeof(*keys));
            if (!keys) return 0;
            container->keys = keys;
        }
        container->cap = cap;
    }
    if (container->type == BA_J_OBJ) container->keys[container->count] = key;
    container->items[container->count] = value;
    container->count++;
    return 1;
}

static const char *ba_skip_ws(const char *p) {
    while (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r') p++;
    return p;
}

static ba_json *ba_parse_value(const char **pp);

/* ba_utf8 encodes one code point, returning how many bytes were written. */
static int ba_utf8(unsigned cp, char *out) {
    if (cp < 0x80) {
        out[0] = (char)cp;
        return 1;
    }
    if (cp < 0x800) {
        out[0] = (char)(0xC0 | (cp >> 6));
        out[1] = (char)(0x80 | (cp & 0x3F));
        return 2;
    }
    if (cp < 0x10000) {
        out[0] = (char)(0xE0 | (cp >> 12));
        out[1] = (char)(0x80 | ((cp >> 6) & 0x3F));
        out[2] = (char)(0x80 | (cp & 0x3F));
        return 3;
    }
    out[0] = (char)(0xF0 | (cp >> 18));
    out[1] = (char)(0x80 | ((cp >> 12) & 0x3F));
    out[2] = (char)(0x80 | ((cp >> 6) & 0x3F));
    out[3] = (char)(0x80 | (cp & 0x3F));
    return 4;
}

static int ba_hex4(const char *p, unsigned *out) {
    unsigned v = 0;
    for (int i = 0; i < 4; i++) {
        char c = p[i];
        v <<= 4;
        if (c >= '0' && c <= '9') v |= (unsigned)(c - '0');
        else if (c >= 'a' && c <= 'f') v |= (unsigned)(c - 'a' + 10);
        else if (c >= 'A' && c <= 'F') v |= (unsigned)(c - 'A' + 10);
        else return 0;
    }
    *out = v;
    return 1;
}

/* ba_parse_string reads a quoted string into a fresh NUL-terminated buffer. */
static char *ba_parse_string(const char **pp) {
    const char *p = *pp;
    if (*p != '"') return NULL;
    p++;

    size_t cap = 32, len = 0;
    char *out = (char *)malloc(cap);
    if (!out) return NULL;

    while (*p && *p != '"') {
        /* Worst case one escape expands to four bytes. */
        if (len + 5 > cap) {
            cap *= 2;
            char *bigger = (char *)realloc(out, cap);
            if (!bigger) { free(out); return NULL; }
            out = bigger;
        }

        if (*p != '\\') {
            out[len++] = *p++;
            continue;
        }

        p++;
        switch (*p) {
            case '"':  out[len++] = '"';  p++; break;
            case '\\': out[len++] = '\\'; p++; break;
            case '/':  out[len++] = '/';  p++; break;
            case 'b':  out[len++] = '\b'; p++; break;
            case 'f':  out[len++] = '\f'; p++; break;
            case 'n':  out[len++] = '\n'; p++; break;
            case 'r':  out[len++] = '\r'; p++; break;
            case 't':  out[len++] = '\t'; p++; break;
            case 'u': {
                unsigned cp;
                if (!ba_hex4(p + 1, &cp)) { free(out); return NULL; }
                p += 5;
                /* A leading surrogate is only meaningful paired with a trailing
                 * one; combine them so astral characters survive. */
                if (cp >= 0xD800 && cp <= 0xDBFF && p[0] == '\\' && p[1] == 'u') {
                    unsigned low;
                    if (ba_hex4(p + 2, &low) && low >= 0xDC00 && low <= 0xDFFF) {
                        cp = 0x10000 + ((cp - 0xD800) << 10) + (low - 0xDC00);
                        p += 6;
                    }
                }
                len += (size_t)ba_utf8(cp, out + len);
                break;
            }
            default:
                free(out);
                return NULL;
        }
    }

    if (*p != '"') { free(out); return NULL; }
    p++;

    out[len] = '\0';
    *pp = p;
    return out;
}

static ba_json *ba_parse_array(const char **pp) {
    const char *p = ba_skip_ws(*pp + 1);
    ba_json *arr = ba_json_new(BA_J_ARR);
    if (!arr) return NULL;

    if (*p == ']') { *pp = p + 1; return arr; }

    for (;;) {
        ba_json *item = ba_parse_value(&p);
        if (!item || !ba_json_push(arr, NULL, item)) {
            ba_json_free(item);
            ba_json_free(arr);
            return NULL;
        }
        p = ba_skip_ws(p);
        if (*p == ',') { p = ba_skip_ws(p + 1); continue; }
        if (*p == ']') { *pp = p + 1; return arr; }
        ba_json_free(arr);
        return NULL;
    }
}

static ba_json *ba_parse_object(const char **pp) {
    const char *p = ba_skip_ws(*pp + 1);
    ba_json *obj = ba_json_new(BA_J_OBJ);
    if (!obj) return NULL;

    if (*p == '}') { *pp = p + 1; return obj; }

    for (;;) {
        p = ba_skip_ws(p);
        char *key = ba_parse_string(&p);
        if (!key) { ba_json_free(obj); return NULL; }

        p = ba_skip_ws(p);
        if (*p != ':') { free(key); ba_json_free(obj); return NULL; }
        p = ba_skip_ws(p + 1);

        ba_json *value = ba_parse_value(&p);
        if (!value || !ba_json_push(obj, key, value)) {
            free(key);
            ba_json_free(value);
            ba_json_free(obj);
            return NULL;
        }

        p = ba_skip_ws(p);
        if (*p == ',') { p++; continue; }
        if (*p == '}') { *pp = p + 1; return obj; }
        ba_json_free(obj);
        return NULL;
    }
}

static ba_json *ba_parse_value(const char **pp) {
    const char *p = ba_skip_ws(*pp);

    switch (*p) {
        case '{': { *pp = p; return ba_parse_object(pp); }
        case '[': { *pp = p; return ba_parse_array(pp); }
        case '"': {
            char *s = ba_parse_string(&p);
            if (!s) return NULL;
            ba_json *v = ba_json_new(BA_J_STR);
            if (!v) { free(s); return NULL; }
            v->str = s;
            *pp = p;
            return v;
        }
        case 't':
            if (strncmp(p, "true", 4) != 0) return NULL;
            *pp = p + 4;
            { ba_json *v = ba_json_new(BA_J_BOOL); if (v) v->num = 1; return v; }
        case 'f':
            if (strncmp(p, "false", 5) != 0) return NULL;
            *pp = p + 5;
            return ba_json_new(BA_J_BOOL);
        case 'n':
            if (strncmp(p, "null", 4) != 0) return NULL;
            *pp = p + 4;
            return ba_json_new(BA_J_NULL);
        default: {
            char *end = NULL;
            double d = strtod(p, &end);
            if (end == p) return NULL;
            ba_json *v = ba_json_new(BA_J_NUM);
            if (!v) return NULL;
            v->num = d;
            *pp = end;
            return v;
        }
    }
}

static ba_json *ba_json_parse(const char *text) {
    const char *p = text;
    ba_json *v = ba_parse_value(&p);
    if (!v) return NULL;
    p = ba_skip_ws(p);
    if (*p != '\0') { ba_json_free(v); return NULL; }
    return v;
}

static const ba_json *ba_json_get(const ba_json *obj, const char *key) {
    if (!obj || obj->type != BA_J_OBJ) return NULL;
    for (int i = 0; i < obj->count; i++) {
        if (strcmp(obj->keys[i], key) == 0) return obj->items[i];
    }
    return NULL;
}

static int ba_json_int(const ba_json *v, int fallback) {
    if (!v) return fallback;
    if (v->type == BA_J_NUM || v->type == BA_J_BOOL) return (int)v->num;
    return fallback;
}

static const char *ba_json_text(const ba_json *v) {
    return (v && v->type == BA_J_STR) ? v->str : "";
}

/* ------------------------------------------------------------- emitter */

struct ba_emitter {
    int *pairs; /* from, to, from, to, ... */
    int count;
    int cap;
    int failed;
};

void ba_emit_move(ba_emitter *out, int from, int to) {
    if (!out || out->failed) return;
    if (out->count == out->cap) {
        int cap = out->cap ? out->cap * 2 : 32;
        int *pairs = (int *)realloc(out->pairs, (size_t)cap * 2 * sizeof(int));
        if (!pairs) { out->failed = 1; return; }
        out->pairs = pairs;
        out->cap = cap;
    }
    out->pairs[out->count * 2] = from;
    out->pairs[out->count * 2 + 1] = to;
    out->count++;
}

/* ------------------------------------------------------------------ IO */

/* The real stdout, kept private so ordinary printing cannot corrupt the
 * protocol. Set up at the top of ba_run. */
static FILE *ba_wire = NULL;

void ba_log(const char *fmt, ...) {
    va_list args;
    va_start(args, fmt);
    vfprintf(stderr, fmt, args);
    va_end(args);
    fputc('\n', stderr);
}

/* ba_write_escaped emits a JSON string body, escaping what must be escaped. */
static void ba_write_escaped(FILE *f, const char *s) {
    for (; *s; s++) {
        unsigned char c = (unsigned char)*s;
        switch (c) {
            case '"':  fputs("\\\"", f); break;
            case '\\': fputs("\\\\", f); break;
            case '\n': fputs("\\n", f);  break;
            case '\r': fputs("\\r", f);  break;
            case '\t': fputs("\\t", f);  break;
            default:
                if (c < 0x20) fprintf(f, "\\u%04x", c);
                else fputc((int)c, f);
        }
    }
}

static void ba_send_error(const char *message) {
    if (!ba_wire) return;
    fputs("{\"type\":\"error\",\"message\":\"", ba_wire);
    ba_write_escaped(ba_wire, message);
    fputs("\"}\n", ba_wire);
    fflush(ba_wire);
}

static int ba_fail(const char *message) {
    ba_send_error(message);
    fprintf(stderr, "bytearena: %s\n", message);
    return 1;
}

/* ba_read_line reads one line from stdin, growing the caller's buffer as
 * needed. Returns 0 at end of input. */
static int ba_read_line(char **buf, size_t *cap) {
    ssize_t n = getline(buf, cap, stdin);
    if (n <= 0) return 0;
    while (n > 0 && ((*buf)[n - 1] == '\n' || (*buf)[n - 1] == '\r')) (*buf)[--n] = '\0';
    return 1;
}

/* ba_next_message reads the next non-blank line and parses it. */
static ba_json *ba_next_message(char **buf, size_t *cap) {
    while (ba_read_line(buf, cap)) {
        const char *p = ba_skip_ws(*buf);
        if (*p == '\0') continue;
        return ba_json_parse(p);
    }
    return NULL;
}

/* ---------------------------------------------------------------- run */

int ba_run(ba_solution solution) {
    /* Hand the real stdout to the protocol and point descriptor 1 at stderr, so
     * printf and anything else that writes to stdout lands in the console
     * instead of corrupting the stream. */
    int wire_fd = dup(1);
    if (wire_fd < 0) {
        fprintf(stderr, "bytearena: cannot duplicate stdout\n");
        return 1;
    }
    if (dup2(2, 1) < 0) {
        fprintf(stderr, "bytearena: cannot redirect stdout\n");
        return 1;
    }
    ba_wire = fdopen(wire_fd, "w");
    if (!ba_wire) {
        fprintf(stderr, "bytearena: cannot open the protocol stream\n");
        return 1;
    }
    /* Line buffering means the author's prints show up as they happen rather
     * than in one burst when the process exits. */
    setvbuf(stdout, NULL, _IOLBF, 0);

    const char *name = solution.name ? solution.name : "solution";

    char *line = NULL;
    size_t cap = 0;
    int status = 0;

    ba_json *init = ba_next_message(&line, &cap);
    if (!init) {
        status = ba_fail("the harness closed the connection before sending anything");
        goto done;
    }
    if (strcmp(ba_json_text(ba_json_get(init, "type")), "init") != 0) {
        status = ba_fail("expected an init request first");
        ba_json_free(init);
        goto done;
    }
    if (ba_json_int(ba_json_get(init, "v"), 0) != BA_VERSION) {
        status = ba_fail("this SDK is built for a different protocol version; it is out of date");
        ba_json_free(init);
        goto done;
    }

    {
        const char *task = ba_json_text(ba_json_get(init, "task"));
        int needs_victim = (strcmp(task, "victim-selection") == 0 || strcmp(task, "wear-leveling") == 0);
        int needs_compact = (strcmp(task, "compaction") == 0);

        if (needs_victim && !solution.select_victim) {
            status = ba_fail("this challenge needs a select_victim callback");
            ba_json_free(init);
            goto done;
        }
        if (needs_compact && !solution.compact) {
            status = ba_fail("this challenge needs a compact callback");
            ba_json_free(init);
            goto done;
        }
        if (!needs_victim && !needs_compact) {
            status = ba_fail("unknown task");
            ba_json_free(init);
            goto done;
        }

        if (solution.setup) {
            const ba_json *c = ba_json_get(init, "config");
            ba_config config;
            config.blocks = ba_json_int(ba_json_get(c, "blocks"), 0);
            config.pages_per_block = ba_json_int(ba_json_get(c, "pagesPerBlock"), 0);
            config.over_provision_blocks = ba_json_int(ba_json_get(c, "overProvisionBlocks"), 0);
            config.slot_count = ba_json_int(ba_json_get(c, "slotCount"), 0);
            solution.setup(&config, solution.user);
        }
    }
    ba_json_free(init);

    fprintf(ba_wire, "{\"type\":\"ready\",\"name\":\"");
    ba_write_escaped(ba_wire, name);
    fputs("\"}\n", ba_wire);
    fflush(ba_wire);

    for (;;) {
        ba_json *req = ba_next_message(&line, &cap);
        /* The harness closing the pipe without a done request means it gave up
         * on us, and it has already recorded why. */
        if (!req) break;

        const char *type = ba_json_text(ba_json_get(req, "type"));

        if (strcmp(type, "done") == 0) {
            ba_json_free(req);
            break;
        }

        if (strcmp(type, "reclaim") == 0) {
            const ba_json *s = ba_json_get(req, "stats");
            const ba_json *blocks = ba_json_get(s, "blocks");
            int n = (blocks && blocks->type == BA_J_ARR) ? blocks->count : 0;

            ba_block *list = n ? (ba_block *)calloc((size_t)n, sizeof(ba_block)) : NULL;
            if (n && !list) {
                status = ba_fail("out of memory building the device view");
                ba_json_free(req);
                goto done;
            }

            for (int i = 0; i < n; i++) {
                const ba_json *b = blocks->items[i];
                list[i].index = ba_json_int(ba_json_get(b, "index"), i);
                list[i].valid = ba_json_int(ba_json_get(b, "valid"), 0);
                list[i].invalid = ba_json_int(ba_json_get(b, "invalid"), 0);
                list[i].free = ba_json_int(ba_json_get(b, "free"), 0);
                list[i].erase_count = ba_json_int(ba_json_get(b, "eraseCount"), 0);
                list[i].is_over_provision = ba_json_int(ba_json_get(b, "isOverProvision"), 0);
            }

            ba_stats stats;
            stats.blocks = list;
            stats.block_count = n;
            stats.pages_per_block = ba_json_int(ba_json_get(s, "pagesPerBlock"), 0);
            stats.total_erases = ba_json_int(ba_json_get(s, "totalErases"), 0);
            stats.free_pages = ba_json_int(ba_json_get(s, "freePages"), 0);
            stats.valid_pages = ba_json_int(ba_json_get(s, "validPages"), 0);
            stats.invalid_pages = ba_json_int(ba_json_get(s, "invalidPages"), 0);

            int victim = solution.select_victim(&stats, solution.user);
            free(list);
            ba_json_free(req);

            fprintf(ba_wire, "{\"type\":\"victim\",\"block\":%d}\n", victim);
            fflush(ba_wire);
            continue;
        }

        if (strcmp(type, "compact") == 0) {
            const ba_json *slots = ba_json_get(req, "slots");
            int n = (slots && slots->type == BA_J_ARR) ? slots->count : 0;

            int *values = n ? (int *)calloc((size_t)n, sizeof(int)) : NULL;
            if (n && !values) {
                status = ba_fail("out of memory building the slot array");
                ba_json_free(req);
                goto done;
            }
            for (int i = 0; i < n; i++) values[i] = ba_json_int(slots->items[i], -1);

            ba_emitter out;
            memset(&out, 0, sizeof(out));
            solution.compact(values, n, &out, solution.user);
            free(values);
            ba_json_free(req);

            if (out.failed) {
                free(out.pairs);
                status = ba_fail("out of memory recording moves");
                goto done;
            }

            fputs("{\"type\":\"moves\",\"moves\":[", ba_wire);
            for (int i = 0; i < out.count; i++) {
                if (i) fputc(',', ba_wire);
                fprintf(ba_wire, "[%d,%d]", out.pairs[i * 2], out.pairs[i * 2 + 1]);
            }
            fputs("]}\n", ba_wire);
            fflush(ba_wire);
            free(out.pairs);
            continue;
        }

        ba_json_free(req);
        status = ba_fail("unknown request");
        goto done;
    }

done:
    free(line);
    fflush(stdout);
    if (ba_wire) fflush(ba_wire);
    return status;
}
