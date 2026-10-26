// Squad Trenchers launch cut (34 s): score + sound design, synthesized. usage: DUR=34 node music_launch.mjs out/music_launch.wav
// usage: node music.mjs out/music.wav      (timings match the film mode in index.html)
import fs from 'node:fs'

const SR = 44100, DUR = +(process.env.DUR || 15), N = SR * DUR, TAU = Math.PI * 2
const L = new Float32Array(N), R = new Float32Array(N), VL = new Float32Array(N), VR = new Float32Array(N)
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
let seed = 4242
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)))
function add(i, v, pan = 0, send = 0) {
  i |= 0; if (i < 0 || i >= N) return
  const a = ((pan + 1) * Math.PI) / 4, l = v * Math.cos(a) * 1.414, r = v * Math.sin(a) * 1.414
  L[i] += l; R[i] += r; if (send) { VL[i] += l * send; VR[i] += r * send }
}
// soft plucked keys: sine + detuned triangle, fast attack, exp decay, gentle lowpass
function pluck(t0, m, amp = 0.12, dec = 4, pan = 0, send = 0.4) {
  const f = mtof(m); let y = 0
  for (let k = 0; k < Math.min(2.5, 6 / dec) * SR; k++) {
    const tt = k / SR, ph = tt * f
    let v = Math.sin(ph * TAU) * 0.7 + (4 * Math.abs(((ph * 1.003) % 1) - 0.5) - 1) * 0.35 + Math.sin(ph * 2 * TAU) * 0.15 * Math.exp(-tt * 12)
    y += 0.35 * (v - y)
    add(t0 * SR + k, y * Math.exp(-tt * dec) * Math.min(1, tt * 600) * amp, pan, send)
  }
}
function pad(t0, t1, notes, amp, att = 0.4, rel = 0.6) {
  notes.forEach((m, ni) => {
    let p1 = 0, p2 = 0, y = 0; const f = mtof(m)
    for (let i = (t0 * SR) | 0; i < Math.min(N, (t1 + rel) * SR); i++) {
      const t = i / SR, env = Math.min(1, (t - t0) / att) * (t > t1 ? Math.max(0, 1 - (t - t1) / rel) : 1)
      p1 += f / SR; p2 += (f * 1.005) / SR
      y += 0.04 * (((p1 % 1) * 2 - 1) + ((p2 % 1) * 2 - 1) - y)
      add(i, y * env * amp, ni % 2 ? 0.45 : -0.45, 0.5)
    }
  })
}
function kick(t0, amp = 0.8) { let ph = 0; for (let k = 0; k < 0.35 * SR; k++) { const tt = k / SR; ph += (TAU * (46 + 100 * Math.exp(-tt * 32))) / SR; add(t0 * SR + k, Math.sin(ph) * Math.exp(-tt * 9) * amp) } }
function snap(t0, amp = 0.3) { let p = 0; for (let k = 0; k < 0.16 * SR; k++) { const tt = k / SR, n = noise(), hp = n - p * 0.8; p = n; add(t0 * SR + k, hp * Math.exp(-tt * 30) * amp, 0.1, 0.35) } }
function hat(t0, amp = 0.08, pan = 0.3) { let p = 0; for (let k = 0; k < 0.04 * SR; k++) { const tt = k / SR, n = noise(), hp = n - p; p = n; add(t0 * SR + k, hp * Math.exp(-tt * 90) * amp, pan) } }
function sub(t0, dur, m, amp = 0.22) { const f = mtof(m); for (let k = 0; k < dur * SR; k++) { const tt = k / SR; const env = Math.min(1, tt * 80) * Math.min(1, (dur - tt) * 30); add(t0 * SR + k, Math.sin(tt * f * TAU) * env * amp) } }
function whoosh(t0, dur, amp = 0.3) { let y = 0; for (let k = 0; k < dur * SR; k++) { const p = k / (dur * SR), e = Math.sin(p * Math.PI) ** 2; y += (0.03 + 0.45 * e) * (noise() - y); add(t0 * SR + k, y * e * amp, (p - 0.5) * 1.6, 0.3) } }
function clink(t0, amp = 0.08, f = 3200, pan = 0) { for (let k = 0; k < 0.35 * SR; k++) { const tt = k / SR; add(t0 * SR + k, (Math.sin(tt * TAU * f) * 0.6 + Math.sin(tt * TAU * f * 2.71) * 0.3 + Math.sin(tt * TAU * f * 4.1) * 0.15) * Math.exp(-tt * 14) * amp, pan, 0.5) } }
function boom(t0, amp = 0.7) { let ph = 0; for (let k = 0; k < 1.5 * SR; k++) { const tt = k / SR; ph += (TAU * (40 + 50 * Math.exp(-tt * 8))) / SR; add(t0 * SR + k, Math.sin(ph) * Math.exp(-tt * 3) * amp, 0, 0.2) } }
function sparkle(t0, amp = 0.06) { ;[84, 88, 91, 96, 100, 103].forEach((m, i) => pluck(t0 + i * 0.045, m, amp, 5, i % 2 ? 0.5 : -0.5, 0.7)) }
function click(t0, amp = 0.3) { for (let k = 0; k < 0.03 * SR; k++) { const tt = k / SR; add(t0 * SR + k, (Math.sin(tt * TAU * 1800) * 0.7 + noise() * 0.3) * Math.exp(-tt * 160) * amp) } }
// extra sound design
function tick(t0, amp = 0.05) { const f = 2600 + noise() * 500; for (let k = 0; k < 0.012 * SR; k++) { const tt = k / SR; add(t0 * SR + k, (Math.sin(tt * TAU * f) * 0.5 + noise() * 0.5) * Math.exp(-tt * 380) * amp, 0.1) } }
function pop(t0, amp = 0.22, f0 = 950, f1 = 420) { let ph = 0; for (let k = 0; k < 0.12 * SR; k++) { const tt = k / SR; ph += TAU * (f1 + (f0 - f1) * Math.exp(-tt * 40)) / SR; add(t0 * SR + k, Math.sin(ph) * Math.exp(-tt * 28) * amp, 0, 0.25) } }
function boing(t0, amp = 0.2) { let ph = 0; for (let k = 0; k < 0.6 * SR; k++) { const tt = k / SR; const f = 220 * Math.pow(2, 1.6 * Math.min(1, tt * 3)) * (1 + 0.06 * Math.sin(tt * 38)); ph += TAU * f / SR; add(t0 * SR + k, Math.sin(ph) * Math.exp(-tt * 4.5) * amp, 0, 0.4) } }
function riser(t0, dur, amp = 0.18) { let y = 0; for (let k = 0; k < dur * SR; k++) { const p = k / (dur * SR); y += (0.02 + 0.5 * p * p) * (noise() - y); add(t0 * SR + k, y * p * p * amp, 0, 0.3) } }
function chime(t0) { pluck(t0, 88, 0.07, 6, 0.3, 0.6); pluck(t0 + 0.08, 95, 0.06, 6, -0.3, 0.6) }
function thud(t0, amp = 0.5) { let ph = 0; for (let k = 0; k < 0.5 * SR; k++) { const tt = k / SR; ph += (TAU * (70 + 60 * Math.exp(-tt * 18))) / SR; add(t0 * SR + k, Math.sin(ph) * Math.exp(-tt * 7) * amp, 0, 0.15) } }
function drop(t0, amp = 0.16) { let ph = 0; for (let k = 0; k < 0.45 * SR; k++) { const tt = k / SR; ph += (TAU * (900 * Math.exp(-tt * 5) + 120)) / SR; add(t0 * SR + k, Math.sin(ph) * Math.exp(-tt * 6) * amp, 0, 0.3) } }


const BEAT = 60 / 124
const CH = [[48, [60, 64, 67, 72]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [43, [55, 59, 62, 67]]]
const DARK = [[45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]], [40, [55, 59, 64]]]
function groove(a, b, ch, opts = {}) {
  const at = (t) => ch[Math.floor(Math.max(0, t - a) / (BEAT * 8)) & 3]
  for (let t = a; t < b - .01; t += BEAT) {
    const k = Math.round((t - a) / BEAT)
    if (!opts.half || k % 2 === 0) kick(t, opts.half ? .5 : .55)
    if (k % 2) snap(t, opts.half ? .1 : .15)
    hat(t + BEAT / 2, opts.half ? .035 : .05, .25); if (opts.half) hat(t + BEAT * .25, .02, -.25)
    sub(t, BEAT * .5, at(t)[0], .15)
  }
  for (let t = a; t < b - .01; t += BEAT * 8) pad(t, Math.min(b, t + BEAT * 8), at(t + .01)[1], opts.half ? .03 : .02, .06, .3)
  for (let t = a + (opts.half ? 0 : BEAT * 2); t < b - .01; t += BEAT / 2) { const n = at(t)[1], k = Math.round((t - a) / (BEAT / 2)); if (k % 4 !== 3) pluck(t, n[k % n.length] + 12, opts.half ? .028 : .035, 5, (k % 2 ? .4 : -.4), .5) }
}
// 0-1.3: typed on black
for (let i = 0; i < 28; i++) click(.15 + i * (.85 / 28), .12)
riser(.6, .7, .2)
// 1.3-8.55: the lore, bright and quick
boom(1.3, .45); pop(1.35, .22, 950, 420); groove(1.3, 8.55, CH)
chime(2.0); pop(2.8, .18, 900, 430); pop(2.9, .18, 1000, 470); pop(3.0, .18, 1100, 510); whoosh(3.6, .4, .2)
pop(3.9, .2, 900, 430); pop(4.12, .2, 1000, 470)
thud(4.6, .45); for (let i = 0; i < 16; i++) tick(4.6 + i * .04, .06)
thud(5.5, .4); for (let i = 0; i < 6; i++) pop(5.5 + i * .07, .1, 1100 - i * 60, 500)
boing(6.45, .14); for (let i = 0; i < 4; i++) pop(6.45 + i * .07, .1, 900 + i * 80, 480)
riser(7.0, .55, .2); boom(7.55, .5); sparkle(7.6, .05); pop(7.85, .2, 950, 420)
whoosh(8.45, .6, .26)
// 8.9-9.7: the promise, then the drop into the floor
pad(8.7, 9.7, [57, 64, 69, 72], .035, .1, .2); riser(9.0, .7, .24)
boom(9.7, .7); sub(9.7, 1.2, 33, .25)
// 9.7-21.4: the floor, darker and half time; a hit on every cut
groove(9.7, 21.4, DARK, { half: true })
;[13.0, 16.2, 18.6].forEach((c) => { whoosh(c - .35, .45, .2); thud(c, .45) })
for (let i = 0; i < 4; i++) pop(13.55 + i * .15, .1, 1200 - i * 90, 600)
chime(14.1)
// 21.4-25.7: back out to the site
whoosh(21.2, .6, .26); boom(21.4, .45); groove(21.4, 25.65, CH)
whoosh(22.35, .5, .15); click(23.12, .5); pop(23.17, .2, 1300, 600); whoosh(23.25, 1.3, .18); chime(23.35)
// 25.65-28: the numbers
;[25.65, 26.25, 26.9].forEach((c, i) => { thud(c, .5); pop(c + .03, .16, 900 + i * 120, 440); kick(c, .5) })
for (let t = 25.65; t < 27.9; t += BEAT / 2) hat(t, .05, .2)
riser(27.25, .75, .24)
// 28-30.7: the coin
boom(28.0, .65); sparkle(28.05, .06); pad(28.0, 30.7, [57, 60, 64, 69, 72], .035, .15, .4)
for (let i = 0; i < 10; i++) pop(28.35 + i * .045, .08, 1000 + i * 40, 500)
pop(29.45, .2, 950, 420)
// 30.7-34: the end card
boom(30.7, .6); sparkle(30.8, .05); pad(30.7, 33.4, [48, 60, 64, 67, 72], .04, .2, .5); pluck(30.9, 84, .06, 3, 0, .7)
/* reverb */
const taps = [[0.037, 0.5], [0.061, 0.42], [0.097, 0.36], [0.141, 0.3], [0.199, 0.24], [0.271, 0.19], [0.37, 0.14], [0.5, 0.1], [0.66, 0.07]]
let dl = 0, dr = 0
for (let i = 0; i < N; i++) {
  let l = 0, r = 0
  for (const [d, g] of taps) { const j = i - Math.floor(d * SR); if (j >= 0) { l += VR[j] * g; r += VL[j] * g } }
  dl += 0.4 * (l - dl); dr += 0.4 * (r - dr); L[i] += dl * 0.7; R[i] += dr * 0.7
}
/* master */
let peak = 0
for (let i = 0; i < N; i++) { const t = i / SR, f = seg(t, 0, 0.05) * (1 - seg(t, DUR - 1, DUR)); L[i] = Math.tanh(L[i] * 1.1) * f; R[i] = Math.tanh(R[i] * 1.1) * f; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])) }
const g = 0.9 / peak, buf = Buffer.alloc(44 + N * 4)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4) }
fs.writeFileSync(process.argv[2] || 'music.wav', buf)
console.log('wrote', process.argv[2], 'peak', peak.toFixed(2))
