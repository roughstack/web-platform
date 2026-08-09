import java.io.BufferedReader;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Java binding for ByteArena solutions.
 *
 * <p>A solution is a normal program. Extend {@link Solution}, override one or
 * two methods, hand it to {@link #run}, and never think about the wire format:
 *
 * <pre>{@code
 * public class Greedy extends ByteArena.Solution {
 *   public String name() { return "greedy"; }
 *
 *   public int selectVictim(ByteArena.Stats stats) {
 *     int best = -1, most = -1;
 *     for (ByteArena.Block b : stats.blocks) {
 *       if (b.invalid > most) { most = b.invalid; best = b.index; }
 *     }
 *     return best;
 *   }
 *
 *   public static void main(String[] args) { ByteArena.run(new Greedy()); }
 * }
 * }</pre>
 *
 * <p>Printing is safe. The protocol owns stdout, so a stray
 * {@code System.out.println} would corrupt it. Rather than forbid printing,
 * {@link #run} repoints {@code System.out} at stderr on entry and keeps the real
 * stdout privately for protocol traffic. Print however you like; it appears in
 * the arena's Console tab and never affects your score.
 *
 * <p>This file carries its own small JSON reader because the Sprite image builds
 * solutions with no network and no dependency resolution.
 */
public final class ByteArena {

    /** Protocol revision this SDK speaks. */
    public static final int VERSION = 1;

    private ByteArena() {}

    // ------------------------------------------------------------- model

    /** One block's occupancy, copied fresh for every request. */
    public static final class Block {
        public final int index;
        public final int valid;
        public final int invalid;
        public final int free;
        public final int eraseCount;
        /**
         * True for reserved blocks that host writes never target. Reclaiming
         * one shrinks the migration reserve, which is nearly always a mistake.
         */
        public final boolean isOverProvision;

        Block(int index, int valid, int invalid, int free, int eraseCount, boolean isOverProvision) {
            this.index = index;
            this.valid = valid;
            this.invalid = invalid;
            this.free = free;
            this.eraseCount = eraseCount;
            this.isOverProvision = isOverProvision;
        }
    }

    /** The whole-device view handed to {@link Solution#selectVictim}. */
    public static final class Stats {
        public final List<Block> blocks;
        public final int pagesPerBlock;
        public final int totalErases;
        public final int freePages;
        public final int validPages;
        public final int invalidPages;

        Stats(List<Block> blocks, int pagesPerBlock, int totalErases,
              int freePages, int validPages, int invalidPages) {
            this.blocks = blocks;
            this.pagesPerBlock = pagesPerBlock;
            this.totalErases = totalErases;
            this.freePages = freePages;
            this.validPages = validPages;
            this.invalidPages = invalidPages;
        }
    }

    /** Geometry announced once, before any work arrives. */
    public static final class Config {
        public final int blocks;
        public final int pagesPerBlock;
        public final int overProvisionBlocks;
        public final int slotCount;

        Config(int blocks, int pagesPerBlock, int overProvisionBlocks, int slotCount) {
            this.blocks = blocks;
            this.pagesPerBlock = pagesPerBlock;
            this.overProvisionBlocks = overProvisionBlocks;
            this.slotCount = slotCount;
        }
    }

    /** A move of a live value from one slot to another. */
    public static final class Move {
        public final int from;
        public final int to;

        public Move(int from, int to) {
            this.from = from;
            this.to = to;
        }
    }

    /** Base class for a solution. Override whichever method the challenge needs. */
    public abstract static class Solution {
        /**
         * Short identifier for the strategy. Shows up in results and on the
         * leaderboard, so describe the strategy rather than yourself.
         */
        public String name() {
            return "solution";
        }

        /**
         * Called once with the geometry before any work arrives, which is the
         * moment to size your own bookkeeping.
         */
        public void setup(Config config) {}

        /**
         * Returns the index of the block to reclaim.
         *
         * <p>Called whenever the device is running out of space. The harness
         * migrates the chosen block's live pages and erases it, so choosing a
         * block full of live data is legal but expensive: every page in it has
         * to be rewritten somewhere else.
         */
        public int selectVictim(Stats stats) {
            throw new UnsupportedOperationException("this challenge needs selectVictim to be overridden");
        }

        /**
         * Returns the moves that gather live values into the front of the
         * array. Each entry of {@code slots} is the value living there, or
         * {@code -1} for an empty slot.
         */
        public List<Move> compact(int[] slots) {
            throw new UnsupportedOperationException("this challenge needs compact to be overridden");
        }
    }

    /** Writes a line to the console. Same as printing. */
    public static void log(Object message) {
        System.err.println(message);
    }

    // --------------------------------------------------------------- run

    private static PrintStream wire;

    /** Serves requests until the harness is done, then exits the process. */
    public static void run(Solution solution) {
        // Hand the real stdout to the protocol and point System.out at stderr,
        // so ordinary printing cannot corrupt the stream.
        wire = new PrintStream(new FileOutputStream(FileDescriptor.out), true, StandardCharsets.UTF_8);
        System.setOut(new PrintStream(new FileOutputStream(FileDescriptor.err), true, StandardCharsets.UTF_8));

        try {
            serve(solution);
            System.exit(0);
        } catch (Throwable t) {
            t.printStackTrace();
            fail(t.getClass().getSimpleName() + ": " + t.getMessage());
        }
    }

    private static void serve(Solution solution) throws Exception {
        BufferedReader in = new BufferedReader(
                new InputStreamReader(System.in, StandardCharsets.UTF_8));

        Map<String, Object> init = nextMessage(in);
        if (init == null) {
            fail("the harness closed the connection before sending anything");
        }
        if (!"init".equals(text(init.get("type")))) {
            fail("expected an init request first, got " + text(init.get("type")));
        }
        if (number(init.get("v")) != VERSION) {
            fail("this SDK speaks protocol v" + VERSION + " but the harness speaks v"
                    + number(init.get("v")) + "; the SDK is out of date");
        }

        String task = text(init.get("task"));
        checkCapability(solution, task);

        Object rawConfig = init.get("config");
        if (rawConfig instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> c = (Map<String, Object>) rawConfig;
            solution.setup(new Config(
                    number(c.get("blocks")),
                    number(c.get("pagesPerBlock")),
                    number(c.get("overProvisionBlocks")),
                    number(c.get("slotCount"))));
        }

        wire.println("{\"type\":\"ready\",\"name\":\"" + escape(solution.name()) + "\"}");

        while (true) {
            Map<String, Object> request = nextMessage(in);
            // The harness closing the pipe without a done request means it gave
            // up on us, and it has already recorded why.
            if (request == null) {
                return;
            }

            String type = text(request.get("type"));
            if ("done".equals(type)) {
                return;
            }

            if ("reclaim".equals(type)) {
                wire.println("{\"type\":\"victim\",\"block\":"
                        + solution.selectVictim(toStats(request.get("stats"))) + "}");
                continue;
            }

            if ("compact".equals(type)) {
                wire.println(movesMessage(solution.compact(toSlots(request.get("slots")))));
                continue;
            }

            fail("unknown request " + type);
        }
    }

    private static void checkCapability(Solution solution, String task) {
        boolean needsVictim = "victim-selection".equals(task) || "wear-leveling".equals(task);
        boolean needsCompact = "compaction".equals(task);

        if (needsVictim && !overrides(solution, "selectVictim", Stats.class)) {
            fail("this challenge needs a selectVictim(ByteArena.Stats) method");
        }
        if (needsCompact && !overrides(solution, "compact", int[].class)) {
            fail("this challenge needs a compact(int[]) method");
        }
        if (!needsVictim && !needsCompact) {
            fail("unknown task " + task);
        }
    }

    private static boolean overrides(Solution solution, String method, Class<?> arg) {
        try {
            return solution.getClass().getMethod(method, arg).getDeclaringClass() != Solution.class;
        } catch (NoSuchMethodException e) {
            return false;
        }
    }

    private static Stats toStats(Object raw) {
        List<Block> blocks = new ArrayList<>();
        int pagesPerBlock = 0, totalErases = 0, freePages = 0, validPages = 0, invalidPages = 0;

        if (raw instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> s = (Map<String, Object>) raw;

            Object rawBlocks = s.get("blocks");
            if (rawBlocks instanceof List) {
                for (Object item : (List<?>) rawBlocks) {
                    if (!(item instanceof Map)) continue;
                    @SuppressWarnings("unchecked")
                    Map<String, Object> b = (Map<String, Object>) item;
                    blocks.add(new Block(
                            number(b.get("index")),
                            number(b.get("valid")),
                            number(b.get("invalid")),
                            number(b.get("free")),
                            number(b.get("eraseCount")),
                            Boolean.TRUE.equals(b.get("isOverProvision"))));
                }
            }
            pagesPerBlock = number(s.get("pagesPerBlock"));
            totalErases = number(s.get("totalErases"));
            freePages = number(s.get("freePages"));
            validPages = number(s.get("validPages"));
            invalidPages = number(s.get("invalidPages"));
        }

        return new Stats(blocks, pagesPerBlock, totalErases, freePages, validPages, invalidPages);
    }

    private static int[] toSlots(Object raw) {
        if (!(raw instanceof List)) {
            return new int[0];
        }
        List<?> list = (List<?>) raw;
        int[] slots = new int[list.size()];
        for (int i = 0; i < slots.length; i++) {
            slots[i] = number(list.get(i));
        }
        return slots;
    }

    private static String movesMessage(List<Move> moves) {
        StringBuilder sb = new StringBuilder("{\"type\":\"moves\",\"moves\":[");
        if (moves != null) {
            for (int i = 0; i < moves.size(); i++) {
                if (i > 0) sb.append(',');
                sb.append('[').append(moves.get(i).from).append(',').append(moves.get(i).to).append(']');
            }
        }
        return sb.append("]}").toString();
    }

    private static void fail(String message) {
        if (wire != null) {
            wire.println("{\"type\":\"error\",\"message\":\"" + escape(message) + "\"}");
        }
        System.err.println("bytearena: " + message);
        System.exit(1);
    }

    private static String text(Object v) {
        return v instanceof String ? (String) v : "";
    }

    private static int number(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : 0;
    }

    private static String escape(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 8);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.toString();
    }

    // -------------------------------------------------------------- JSON

    @SuppressWarnings("unchecked")
    private static Map<String, Object> nextMessage(BufferedReader in) throws Exception {
        String line;
        while ((line = in.readLine()) != null) {
            line = line.trim();
            if (line.isEmpty()) continue;
            Object parsed = new Json(line).parse();
            return parsed instanceof Map ? (Map<String, Object>) parsed : new LinkedHashMap<>();
        }
        return null;
    }

    /** A small recursive-descent JSON reader, enough for this protocol. */
    private static final class Json {
        private final String src;
        private int pos;

        Json(String src) {
            this.src = src;
        }

        Object parse() {
            Object value = value();
            skipWhitespace();
            if (pos != src.length()) {
                throw new IllegalArgumentException("trailing characters after JSON value");
            }
            return value;
        }

        private Object value() {
            skipWhitespace();
            if (pos >= src.length()) throw new IllegalArgumentException("unexpected end of JSON");

            char c = src.charAt(pos);
            switch (c) {
                case '{': return object();
                case '[': return array();
                case '"': return string();
                case 't': expect("true"); return Boolean.TRUE;
                case 'f': expect("false"); return Boolean.FALSE;
                case 'n': expect("null"); return null;
                default: return number();
            }
        }

        private Map<String, Object> object() {
            Map<String, Object> map = new LinkedHashMap<>();
            pos++; // {
            skipWhitespace();
            if (peek() == '}') { pos++; return map; }

            while (true) {
                skipWhitespace();
                String key = string();
                skipWhitespace();
                if (peek() != ':') throw new IllegalArgumentException("expected ':' in object");
                pos++;
                map.put(key, value());
                skipWhitespace();
                char c = peek();
                pos++;
                if (c == ',') continue;
                if (c == '}') return map;
                throw new IllegalArgumentException("expected ',' or '}' in object");
            }
        }

        private List<Object> array() {
            List<Object> list = new ArrayList<>();
            pos++; // [
            skipWhitespace();
            if (peek() == ']') { pos++; return list; }

            while (true) {
                list.add(value());
                skipWhitespace();
                char c = peek();
                pos++;
                if (c == ',') continue;
                if (c == ']') return list;
                throw new IllegalArgumentException("expected ',' or ']' in array");
            }
        }

        private String string() {
            if (peek() != '"') throw new IllegalArgumentException("expected a string");
            pos++;

            StringBuilder sb = new StringBuilder();
            while (pos < src.length()) {
                char c = src.charAt(pos++);
                if (c == '"') return sb.toString();
                if (c != '\\') { sb.append(c); continue; }

                char esc = src.charAt(pos++);
                switch (esc) {
                    case '"': sb.append('"'); break;
                    case '\\': sb.append('\\'); break;
                    case '/': sb.append('/'); break;
                    case 'b': sb.append('\b'); break;
                    case 'f': sb.append('\f'); break;
                    case 'n': sb.append('\n'); break;
                    case 'r': sb.append('\r'); break;
                    case 't': sb.append('\t'); break;
                    case 'u':
                        sb.append((char) Integer.parseInt(src.substring(pos, pos + 4), 16));
                        pos += 4;
                        break;
                    default: throw new IllegalArgumentException("bad escape \\" + esc);
                }
            }
            throw new IllegalArgumentException("unterminated string");
        }

        private Number number() {
            int start = pos;
            while (pos < src.length() && "+-0123456789.eE".indexOf(src.charAt(pos)) >= 0) pos++;
            String text = src.substring(start, pos);
            if (text.isEmpty()) throw new IllegalArgumentException("expected a number");
            if (text.indexOf('.') < 0 && text.indexOf('e') < 0 && text.indexOf('E') < 0) {
                return Long.valueOf(Long.parseLong(text));
            }
            return Double.valueOf(Double.parseDouble(text));
        }

        private void expect(String literal) {
            if (!src.startsWith(literal, pos)) {
                throw new IllegalArgumentException("expected " + literal);
            }
            pos += literal.length();
        }

        private char peek() {
            if (pos >= src.length()) throw new IllegalArgumentException("unexpected end of JSON");
            return src.charAt(pos);
        }

        private void skipWhitespace() {
            while (pos < src.length() && Character.isWhitespace(src.charAt(pos))) pos++;
        }
    }
}
