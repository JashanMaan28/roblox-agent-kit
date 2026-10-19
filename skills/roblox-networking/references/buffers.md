# `buffer` library reference

Fixed-size mutable byte block. Checked against the official [buffer library page](https://create.roblox.com/docs/reference/engine/libraries/buffer) (source: `buffer.yaml` in Roblox/creator-docs).

- Max size: **1 GiB** (`1_073_741_824` bytes). Large allocations can fail on low-memory devices.
- Numeric reads/writes are **little-endian**.
- All offsets are **byte offsets from 0**, except `readbits`/`writebits`, which take **bit offsets**. Offsets, counts and sizes must be non-negative integers.
- Any read or write that touches bytes outside the buffer **throws**.
- Passing a buffer through Roblox APIs (RemoteEvents, BindableEvents, etc.) **copies** it: the receiver gets a new buffer object, not the same identity.
- The same buffer object cannot be used from multiple Actor scripts (Parallel Luau).

There is no `readinteger`/`writeinteger` or variable-width integer function: pick a fixed width below, or use `readbits`/`writebits` for odd widths.

---

## Lifecycle

```
buffer.create(size: number) -> buffer
buffer.fromstring(str: string) -> buffer
buffer.tostring(b: buffer) -> string
buffer.len(b: buffer) -> number
```

`create` zero-initializes every byte. `fromstring` makes a buffer with the same byte length and content as the string. `tostring` returns the full byte content as a (binary) string.

---

## Numeric reads / writes

For each integer width (i8, u8, i16, u16, i32, u32) and the floats f32, f64:

```
buffer.readi8(b: buffer, offset: number) -> number
buffer.writei8(b: buffer, offset: number, value: number) -> ()

buffer.readu8(b: buffer, offset: number) -> number
buffer.writeu8(b: buffer, offset: number, value: number) -> ()

buffer.readi16 / writei16   (2 bytes)
buffer.readu16 / writeu16   (2 bytes)
buffer.readi32 / writei32   (4 bytes)
buffer.readu32 / writeu32   (4 bytes)
buffer.readf32 / writef32   (4 bytes, IEEE 754 single precision)
buffer.readf64 / writef64   (8 bytes, IEEE 754 double precision)
```

- Each integer write converts the number to that width; the docs specify the valid input range (for example `[-128, 127]` for `writei8`, `[0, 255]` for `writeu8`). Clamp or validate before writing instead of relying on wraparound.
- `f32` loses precision (about 7 significant digits): fine for positions and angles, not for currency, ids, or timestamps.
- Signed reads return negative numbers for values with the sign bit set.

---

## Bit-level

```
buffer.readbits(b: buffer, bitOffset: number, bitCount: number) -> number
buffer.writebits(b: buffer, bitOffset: number, bitCount: number, value: number) -> ()
```

`bitCount` must be `0..32` inclusive (anything else throws). `readbits` returns an unsigned integer; `writebits` treats `value` as an unsigned 32-bit number and writes only its `bitCount` least significant bits. A `bitCount` of `0` reads `0` / writes nothing, so generic code with dynamic widths does not need a special case. Equivalences:

- `readbits(b, 0, 8)` ≡ `readu8(b, 0)`
- `readbits(b, 0, 16)` ≡ `readu16(b, 0)`
- `readbits(b, 0, 32)` ≡ `readu32(b, 0)`
- `readbits(b, 0, 24)` reads 24 bits, which no fixed-width call can.

Because a buffer can be 1 GiB, a `bitOffset` may exceed the 32-bit range; do not do bit-offset arithmetic with `bit32` functions.

---

## Strings

```
buffer.readstring(b: buffer, offset: number, count: number) -> string
buffer.writestring(b: buffer, offset: number, value: string, count: number?) -> ()
```

`writestring` with `count` writes only the first `count` bytes of `value`; `count` cannot exceed `#value`. Lengths are bytes, not characters. For variable-length strings, write a length prefix (`writeu8`/`writeu16`) first, and on the receiving side check the prefix against both your own maximum and the remaining buffer length before `readstring`.

---

## Bulk

```
buffer.copy(target: buffer, targetOffset: number, source: buffer, sourceOffset: number?, count: number?) -> ()
buffer.fill(b: buffer, offset: number, value: number, count: number?) -> ()
```

- `copy`: `sourceOffset` defaults to `0`; omitting `count` copies everything from `sourceOffset` to the end of `source`. `source` and `target` may be the same buffer; overlapping regions behave as if copied through a temporary buffer.
- `fill`: `value` is an integer in `[0, 255]`; omitting `count` fills to the end of the buffer.

---

## Example: packed remote payload with server-side validation

```luau
-- Shared/AimPacket.luau: 1 + 3*4 + 2 = 15 bytes instead of a table with string keys
local AimPacket = {}
AimPacket.SIZE = 15
local VERSION = 1

function AimPacket.encode(pos: Vector3, yawDegrees: number): buffer
	local b = buffer.create(AimPacket.SIZE)
	buffer.writeu8(b, 0, VERSION)
	buffer.writef32(b, 1, pos.X)
	buffer.writef32(b, 5, pos.Y)
	buffer.writef32(b, 9, pos.Z)
	-- quantize yaw 0..360 into 16 bits
	buffer.writeu16(b, 13, math.clamp(math.round((yawDegrees % 360) / 360 * 65535), 0, 65535))
	return b
end

-- Returns nil for anything malformed. The payload is attacker-controlled:
-- check the type and exact length BEFORE reading (out-of-range reads throw),
-- then validate the decoded values like any other remote argument.
function AimPacket.decode(b: unknown): (Vector3?, number?)
	if typeof(b) ~= "buffer" or buffer.len(b) ~= AimPacket.SIZE then
		return nil
	end
	if buffer.readu8(b, 0) ~= VERSION then
		return nil
	end
	local x, y, z = buffer.readf32(b, 1), buffer.readf32(b, 5), buffer.readf32(b, 9)
	for _, v in { x, y, z } do
		if v ~= v or math.abs(v) == math.huge then
			return nil -- f32 can carry NaN/inf just like a number argument
		end
	end
	return Vector3.new(x, y, z), buffer.readu16(b, 13) / 65535 * 360
end

return AimPacket
```

The server still checks the decoded position against the player's server-observed character (see full.md §3/§3a). A schema guarantees shape, never semantics.

---

## Use cases

- **Compact RemoteEvent / UnreliableRemoteEvent payloads.** A packed buffer is usually smaller on the wire than an equivalent table with string keys. Worth it for high-frequency events (positions, inputs, aim) and for staying under the 1000-byte `UnreliableRemoteEvent` cap; measure before and after (full.md §7) instead of assuming.
- **Reading/writing binary formats.** Replaces `string.pack`/`string.unpack` with a stable, mutable structure instead of repeated string concatenation.
- **Preallocated scratch space** when building large byte strings (avoids quadratic `..` concatenation).
- **Numeric-heavy code under `--!native`.** The native code generation docs call out math on tables and especially buffers as a good fit.

## Don't use it for

- **Raw DataStore values.** Strings stored in a data store must be valid UTF-8, and `buffer.tostring` output with bytes above 127 generally is not, so the write fails. Data stores also measure storage on their own compressed form, so pre-compressing rarely pays. If you must persist packed bytes, encode them to a UTF-8-safe text form (for example base64) and measure the actual saving (see roblox-data).
- **Tiny or occasional payloads.** `buffer.create` plus reads/writes is more code and more bugs than a 3-field table for an event fired a few times a minute.
- **Arbitrary structured data with no schema.** A buffer has no field names or types; pair it with a versioned format you control (or a generator such as the IDL tools in full.md §7d).
- **State shared across Actors.** Use `SharedTable` instead (see roblox-performance).
