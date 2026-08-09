//! Rust binding for ByteArena solutions.
//!
//! A solution is a normal program. Implement [`Solution`], hand it to [`run`],
//! and never think about the wire format:
//!
//! ```ignore
//! mod bytearena;
//! use bytearena::{Solution, Stats};
//!
//! struct Greedy;
//!
//! impl Solution for Greedy {
//!     fn name(&self) -> String { "greedy".into() }
//!
//!     fn select_victim(&mut self, stats: &Stats) -> i32 {
//!         stats.blocks.iter().max_by_key(|b| b.invalid).map_or(-1, |b| b.index)
//!     }
//! }
//!
//! fn main() { bytearena::run(Greedy); }
//! ```
//!
//! # Printing is safe
//!
//! The protocol owns stdout, so a stray `println!` would corrupt it. Rather
//! than forbid printing — the first thing anyone reaches for when debugging —
//! [`run`] points file descriptor 1 at stderr on entry and keeps the real
//! stdout privately for protocol traffic. Print however you like; it appears in
//! the arena's Console tab and never affects your score.
//!
//! This file has no dependencies, including no `libc`, because the Sprite image
//! builds solutions with no network and no registry access.

#![allow(dead_code)]

use std::fs::File;
use std::io::{BufRead, Write};
use std::os::unix::io::FromRawFd;

/// Protocol revision this SDK speaks.
pub const VERSION: i64 = 1;

// Declared directly rather than pulling in the libc crate, which the build
// environment cannot fetch.
extern "C" {
    fn dup(oldfd: i32) -> i32;
    fn dup2(oldfd: i32, newfd: i32) -> i32;
}

/// One block's occupancy, copied fresh for every request.
#[derive(Debug, Clone, Default)]
pub struct Block {
    pub index: i32,
    pub valid: i32,
    pub invalid: i32,
    pub free: i32,
    pub erase_count: i32,
    /// True for reserved blocks that host writes never target. Reclaiming one
    /// shrinks the migration reserve, which is nearly always a mistake.
    pub is_over_provision: bool,
}

/// The whole-device view handed to [`Solution::select_victim`].
#[derive(Debug, Clone, Default)]
pub struct Stats {
    pub blocks: Vec<Block>,
    pub pages_per_block: i32,
    pub total_erases: i32,
    pub free_pages: i32,
    pub valid_pages: i32,
    pub invalid_pages: i32,
}

/// Geometry announced once, before any work arrives.
#[derive(Debug, Clone, Default)]
pub struct Config {
    pub blocks: i32,
    pub pages_per_block: i32,
    pub over_provision_blocks: i32,
    pub slot_count: i32,
}

/// A solution. Implement whichever method the challenge calls for.
pub trait Solution {
    /// Short identifier for the strategy. Shows up in results and on the
    /// leaderboard, so describe the strategy rather than yourself.
    fn name(&self) -> String {
        "solution".to_string()
    }

    /// Called once with the geometry before any work arrives, which is the
    /// moment to size your own bookkeeping.
    fn setup(&mut self, _config: &Config) {}

    /// Returns the index of the block to reclaim.
    ///
    /// Called whenever the device is running out of space. The harness migrates
    /// the chosen block's live pages and erases it, so choosing a block full of
    /// live data is legal but expensive: every page in it has to be rewritten
    /// somewhere else.
    fn select_victim(&mut self, _stats: &Stats) -> i32 {
        unimplemented!("this challenge needs select_victim to be implemented")
    }

    /// Returns the moves that gather live values into the front of the array.
    /// Each entry of `slots` is the value living there, or `-1` for empty.
    fn compact(&mut self, _slots: &[i32]) -> Vec<(i32, i32)> {
        unimplemented!("this challenge needs compact to be implemented")
    }

    /// Reports whether this solution can answer victim-selection requests.
    /// Override to `false` only if you implement compaction instead.
    fn handles_victim_selection(&self) -> bool {
        true
    }

    /// Reports whether this solution can answer compaction requests.
    fn handles_compaction(&self) -> bool {
        true
    }
}

/// Writes a line to the console. Same as `eprintln!`.
pub fn log(message: &str) {
    eprintln!("{message}");
}

// ------------------------------------------------------------------- JSON

/// A parsed JSON value. Objects keep insertion order in a flat vector, which is
/// faster than a map at these sizes and keeps the parser dependency-free.
#[derive(Debug, Clone)]
enum Json {
    Null,
    Bool(bool),
    Num(f64),
    Str(String),
    Arr(Vec<Json>),
    Obj(Vec<(String, Json)>),
}

impl Json {
    fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Json::Obj(pairs) => pairs.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    fn as_i32(&self) -> i32 {
        match self {
            Json::Num(n) => *n as i32,
            Json::Bool(b) => i32::from(*b),
            _ => 0,
        }
    }

    fn as_i64(&self) -> i64 {
        match self {
            Json::Num(n) => *n as i64,
            _ => 0,
        }
    }

    fn as_str(&self) -> &str {
        match self {
            Json::Str(s) => s,
            _ => "",
        }
    }

    fn as_slice(&self) -> &[Json] {
        match self {
            Json::Arr(items) => items,
            _ => &[],
        }
    }

    /// Convenience for a missing key: reading a field off `None` should yield
    /// the same zero value as reading it off a null.
    fn field(value: Option<&Json>, key: &str) -> Json {
        value
            .and_then(|v| v.get(key))
            .cloned()
            .unwrap_or(Json::Null)
    }
}

struct Parser<'a> {
    bytes: &'a [u8],
    pos: usize,
}

impl<'a> Parser<'a> {
    fn new(text: &'a str) -> Self {
        Parser { bytes: text.as_bytes(), pos: 0 }
    }

    fn parse(&mut self) -> Result<Json, String> {
        let value = self.value()?;
        self.skip_whitespace();
        if self.pos != self.bytes.len() {
            return Err("trailing characters after JSON value".into());
        }
        Ok(value)
    }

    fn value(&mut self) -> Result<Json, String> {
        self.skip_whitespace();
        match self.peek()? {
            b'{' => self.object(),
            b'[' => self.array(),
            b'"' => Ok(Json::Str(self.string()?)),
            b't' => self.literal("true", Json::Bool(true)),
            b'f' => self.literal("false", Json::Bool(false)),
            b'n' => self.literal("null", Json::Null),
            _ => self.number(),
        }
    }

    fn object(&mut self) -> Result<Json, String> {
        self.pos += 1; // {
        let mut pairs = Vec::new();
        self.skip_whitespace();
        if self.peek()? == b'}' {
            self.pos += 1;
            return Ok(Json::Obj(pairs));
        }
        loop {
            self.skip_whitespace();
            let key = self.string()?;
            self.skip_whitespace();
            if self.peek()? != b':' {
                return Err("expected ':' in object".into());
            }
            self.pos += 1;
            pairs.push((key, self.value()?));
            self.skip_whitespace();
            match self.next()? {
                b',' => continue,
                b'}' => return Ok(Json::Obj(pairs)),
                _ => return Err("expected ',' or '}' in object".into()),
            }
        }
    }

    fn array(&mut self) -> Result<Json, String> {
        self.pos += 1; // [
        let mut items = Vec::new();
        self.skip_whitespace();
        if self.peek()? == b']' {
            self.pos += 1;
            return Ok(Json::Arr(items));
        }
        loop {
            items.push(self.value()?);
            self.skip_whitespace();
            match self.next()? {
                b',' => continue,
                b']' => return Ok(Json::Arr(items)),
                _ => return Err("expected ',' or ']' in array".into()),
            }
        }
    }

    fn string(&mut self) -> Result<String, String> {
        if self.peek()? != b'"' {
            return Err("expected a string".into());
        }
        self.pos += 1;

        let mut out = String::new();
        loop {
            let c = self.next()?;
            match c {
                b'"' => return Ok(out),
                b'\\' => {
                    let esc = self.next()?;
                    match esc {
                        b'"' => out.push('"'),
                        b'\\' => out.push('\\'),
                        b'/' => out.push('/'),
                        b'b' => out.push('\u{8}'),
                        b'f' => out.push('\u{c}'),
                        b'n' => out.push('\n'),
                        b'r' => out.push('\r'),
                        b't' => out.push('\t'),
                        b'u' => out.push(self.unicode_escape()?),
                        _ => return Err("bad escape sequence".into()),
                    }
                }
                _ => {
                    // Copy the whole UTF-8 sequence, not just the lead byte.
                    let width = utf8_width(c);
                    let start = self.pos - 1;
                    self.pos = (start + width).min(self.bytes.len());
                    match std::str::from_utf8(&self.bytes[start..self.pos]) {
                        Ok(s) => out.push_str(s),
                        Err(_) => return Err("invalid UTF-8 in string".into()),
                    }
                }
            }
        }
    }

    fn unicode_escape(&mut self) -> Result<char, String> {
        let code = self.hex4()?;
        // A leading surrogate only means something paired with a trailing one.
        if (0xD800..=0xDBFF).contains(&code)
            && self.bytes.get(self.pos) == Some(&b'\\')
            && self.bytes.get(self.pos + 1) == Some(&b'u')
        {
            let save = self.pos;
            self.pos += 2;
            let low = self.hex4()?;
            if (0xDC00..=0xDFFF).contains(&low) {
                let combined = 0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00);
                return char::from_u32(combined).ok_or_else(|| "bad surrogate pair".to_string());
            }
            self.pos = save;
        }
        char::from_u32(code).ok_or_else(|| "bad unicode escape".to_string())
    }

    fn hex4(&mut self) -> Result<u32, String> {
        if self.pos + 4 > self.bytes.len() {
            return Err("truncated unicode escape".into());
        }
        let text = std::str::from_utf8(&self.bytes[self.pos..self.pos + 4])
            .map_err(|_| "bad unicode escape".to_string())?;
        let value = u32::from_str_radix(text, 16).map_err(|_| "bad unicode escape".to_string())?;
        self.pos += 4;
        Ok(value)
    }

    fn number(&mut self) -> Result<Json, String> {
        let start = self.pos;
        while self.pos < self.bytes.len()
            && matches!(self.bytes[self.pos], b'+' | b'-' | b'.' | b'e' | b'E' | b'0'..=b'9')
        {
            self.pos += 1;
        }
        let text = std::str::from_utf8(&self.bytes[start..self.pos])
            .map_err(|_| "bad number".to_string())?;
        text.parse::<f64>()
            .map(Json::Num)
            .map_err(|_| format!("bad number {text:?}"))
    }

    fn literal(&mut self, word: &str, value: Json) -> Result<Json, String> {
        if self.bytes[self.pos..].starts_with(word.as_bytes()) {
            self.pos += word.len();
            Ok(value)
        } else {
            Err(format!("expected {word}"))
        }
    }

    fn peek(&self) -> Result<u8, String> {
        self.bytes.get(self.pos).copied().ok_or_else(|| "unexpected end of JSON".to_string())
    }

    fn next(&mut self) -> Result<u8, String> {
        let c = self.peek()?;
        self.pos += 1;
        Ok(c)
    }

    fn skip_whitespace(&mut self) {
        while self.pos < self.bytes.len() && self.bytes[self.pos].is_ascii_whitespace() {
            self.pos += 1;
        }
    }
}

fn utf8_width(lead: u8) -> usize {
    match lead {
        0x00..=0x7F => 1,
        0xC0..=0xDF => 2,
        0xE0..=0xEF => 3,
        _ => 4,
    }
}

fn escape_json(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

// -------------------------------------------------------------------- run

fn to_stats(raw: Option<&Json>) -> Stats {
    let blocks = Json::field(raw, "blocks")
        .as_slice()
        .iter()
        .map(|b| Block {
            index: Json::field(Some(b), "index").as_i32(),
            valid: Json::field(Some(b), "valid").as_i32(),
            invalid: Json::field(Some(b), "invalid").as_i32(),
            free: Json::field(Some(b), "free").as_i32(),
            erase_count: Json::field(Some(b), "eraseCount").as_i32(),
            is_over_provision: matches!(Json::field(Some(b), "isOverProvision"), Json::Bool(true)),
        })
        .collect();

    Stats {
        blocks,
        pages_per_block: Json::field(raw, "pagesPerBlock").as_i32(),
        total_erases: Json::field(raw, "totalErases").as_i32(),
        free_pages: Json::field(raw, "freePages").as_i32(),
        valid_pages: Json::field(raw, "validPages").as_i32(),
        invalid_pages: Json::field(raw, "invalidPages").as_i32(),
    }
}

/// Serves requests until the harness is done, then exits the process.
pub fn run<S: Solution>(mut solution: S) -> ! {
    // Hand the real stdout to the protocol and point descriptor 1 at stderr, so
    // ordinary printing cannot corrupt the stream.
    let wire_fd = unsafe { dup(1) };
    if wire_fd < 0 {
        eprintln!("bytearena: cannot duplicate stdout");
        std::process::exit(1);
    }
    if unsafe { dup2(2, 1) } < 0 {
        eprintln!("bytearena: cannot redirect stdout");
        std::process::exit(1);
    }
    let mut wire = unsafe { File::from_raw_fd(wire_fd) };

    let stdin = std::io::stdin();
    let mut lines = stdin.lock().lines();

    let mut send = |payload: &str| {
        let _ = writeln!(wire, "{payload}");
        let _ = wire.flush();
    };

    macro_rules! fail {
        ($($arg:tt)*) => {{
            let message = format!($($arg)*);
            send(&format!(
                "{{\"type\":\"error\",\"message\":\"{}\"}}",
                escape_json(&message)
            ));
            eprintln!("bytearena: {message}");
            std::process::exit(1);
        }};
    }

    let mut next_message = || -> Option<Json> {
        for line in lines.by_ref() {
            let line = match line {
                Ok(l) => l,
                Err(_) => return None,
            };
            if line.trim().is_empty() {
                continue;
            }
            return match Parser::new(line.trim()).parse() {
                Ok(v) => Some(v),
                Err(e) => {
                    eprintln!("bytearena: could not parse a message from the harness: {e}");
                    None
                }
            };
        }
        None
    };

    let init = match next_message() {
        Some(v) => v,
        None => fail!("the harness closed the connection before sending anything"),
    };

    if Json::field(Some(&init), "type").as_str() != "init" {
        fail!("expected an init request first");
    }
    if Json::field(Some(&init), "v").as_i64() != VERSION {
        fail!("this SDK speaks protocol v{VERSION} but the harness speaks another; it is out of date");
    }

    let task = Json::field(Some(&init), "task").as_str().to_string();
    match task.as_str() {
        "victim-selection" | "wear-leveling" => {
            if !solution.handles_victim_selection() {
                fail!("this challenge needs select_victim to be implemented");
            }
        }
        "compaction" => {
            if !solution.handles_compaction() {
                fail!("this challenge needs compact to be implemented");
            }
        }
        other => fail!("unknown task {other:?}"),
    }

    if let Some(config) = init.get("config") {
        solution.setup(&Config {
            blocks: Json::field(Some(config), "blocks").as_i32(),
            pages_per_block: Json::field(Some(config), "pagesPerBlock").as_i32(),
            over_provision_blocks: Json::field(Some(config), "overProvisionBlocks").as_i32(),
            slot_count: Json::field(Some(config), "slotCount").as_i32(),
        });
    }

    send(&format!(
        "{{\"type\":\"ready\",\"name\":\"{}\"}}",
        escape_json(&solution.name())
    ));

    loop {
        // The harness closing the pipe without a done request means it gave up
        // on us, and it has already recorded why.
        let Some(request) = next_message() else {
            std::process::exit(0);
        };

        match Json::field(Some(&request), "type").as_str() {
            "done" => std::process::exit(0),

            "reclaim" => {
                let stats = to_stats(request.get("stats"));
                let block = solution.select_victim(&stats);
                send(&format!("{{\"type\":\"victim\",\"block\":{block}}}"));
            }

            "compact" => {
                let slots: Vec<i32> = Json::field(Some(&request), "slots")
                    .as_slice()
                    .iter()
                    .map(Json::as_i32)
                    .collect();
                let moves = solution.compact(&slots);
                let body = moves
                    .iter()
                    .map(|(from, to)| format!("[{from},{to}]"))
                    .collect::<Vec<_>>()
                    .join(",");
                send(&format!("{{\"type\":\"moves\",\"moves\":[{body}]}}"));
            }

            other => fail!("unknown request {other:?}"),
        }
    }
}
