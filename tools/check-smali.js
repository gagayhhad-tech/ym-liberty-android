// Static verifier for hand-written smali.
//
// apktool happily assembles bytecode that ART then rejects with VerifyError at
// class load, which surfaces as a crash on the device with no build-time signal.
// This script catches the classes of defect that have actually bitten us:
//
//   1. register overflow        — using vN >= (registers - params), which aliases
//                                 a parameter (usually p0/`this`) and corrupts it
//   2. constructor order        — writing a field before super() runs
//   3. orphaned .registers      — a lost .method header (apktool reports this as
//                                 the unhelpful "missing EOF at '.registers'")
//   4. wrong invoke arity       — a call passing fewer/more registers than the
//                                 target signature needs (ART: "expected N
//                                 argument registers, method signature has M")
//   5. illegal move-exception   — a handler entry that is also reachable as a
//                                 normal branch target (ART: "invalid use of
//                                 move-exception as branch target")
//   6. duplicate labels         — two labels with the same name inside one method
//
// Run:  node tools/check-smali.js
const fs = require('fs');
const path = require('path');

// Run:  node tools/check-smali.js [path/to/smali]
//
// With no argument it checks android_app/smali (the sources you edit). Pass a
// path to check a decoded APK instead, which verifies exactly what ships:
//   apktool d app.apk -o out && node tools/check-smali.js out/smali
const ROOT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'android_app', 'smali');

console.log(`checking: ${ROOT}\n`);

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.smali')) out.push(p);
  }
  return out;
}

// ---- known framework signatures we depend on ------------------------------
// type descriptor -> number of registers the invoke must pass.
// Arrays/objects count as 1, long/double as 2.
const KNOWN = {
  'Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;': 1,
  'Landroid/app/PendingIntent;->getActivity(Landroid/content/Context;ILandroid/content/Intent;I)Landroid/app/PendingIntent;': 4,
  'Landroid/app/PendingIntent;->getService(Landroid/content/Context;ILandroid/content/Intent;I)Landroid/app/PendingIntent;': 4,
  'Landroid/app/PendingIntent;->getBroadcast(Landroid/content/Context;ILandroid/content/Intent;I)Landroid/app/PendingIntent;': 4,
  'Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V': 3,
  'Landroid/content/Intent;->setAction(Ljava/lang/String;)Landroid/content/Intent;': 2,
  'Landroid/content/Intent;->setFlags(I)Landroid/content/Intent;': 2,
  'Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;': 2,
  'Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;': 3,
  'Landroid/content/Intent;->putExtra(Ljava/lang/String;Z)Landroid/content/Intent;': 3,
  'Landroid/content/Intent;->putExtra(Ljava/lang/String;I)Landroid/content/Intent;': 3,
  'Landroid/content/Intent;->setDataAndType(Landroid/net/Uri;Ljava/lang/String;)Landroid/content/Intent;': 3,
  'Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V': 3,
  'Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V': 3,
};

function countRegisters(desc) {
  let n = 0;
  for (let i = 0; i < desc.length; i++) {
    const c = desc[i];
    if (c === 'L') { n += 1; while (i < desc.length && desc[i] !== ';') i++; }
    else if (c === '[') continue;
    else if (c === 'J' || c === 'D') n += 2;
    else n += 1;
  }
  return n;
}

function paramRegisters(desc, isStatic) {
  return countRegisters(desc) + (isStatic ? 0 : 1);
}

const problems = [];
const push = (rel, line, msg) => problems.push(`${rel}:${line} ${msg}`);

// ---- pass 1: index every method we declare --------------------------------
// Needed to validate our own calls. The access flags are parsed as a whole
// field because "static" can sit anywhere in them
// (e.g. "private static declared-synchronized").
const HEADER = /^\.method\s+(.*?)\s*([\w$<>]+)\((.*?)\)(\S+)\s*$/;
const signatures = new Map(); // "Lcls;->name(params)ret" -> { regs, isStatic }
const allFiles = walk(ROOT);

for (const file of allFiles) {
  const src = fs.readFileSync(file, 'utf8');
  let cls = null;
  for (const line of src.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^\.class\s+(?:.*\s)?(L[^\s;]+;)/))) cls = m[1];
    const hm = line.match(HEADER);
    if (hm && cls) {
      const [, flags, name, params, ret] = hm;
      const isStatic = /\bstatic\b/.test(flags);
      signatures.set(`${cls}->${name}(${params})${ret}`, {
        regs: countRegisters(params) + (isStatic ? 0 : 1),
        isStatic,
      });
    }
  }
}

// ---- pass 2: per-method structural checks ---------------------------------
for (const file of allFiles) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');

  // ---- 3. orphaned .registers/.locals ------------------------------------
  const srcLines = src.split(/\r?\n/);
  for (let i = 0; i < srcLines.length; i++) {
    if (/^\.(registers|locals)\b/.test(srcLines[i])) {
      let prev = i - 1;
      while (prev >= 0 && srcLines[prev].trim() === '') prev--;
      if (!/^\.method\b/.test(srcLines[prev] || '')) {
        push(rel, i + 1, `orphaned ${srcLines[i].trim()} — the .method header above it is missing`);
      }
    }
  }

  const methodRe = /\.method[^\n]*\n([\s\S]*?)\.end method/g;
  let m;

  while ((m = methodRe.exec(src))) {
    const block = m[0];
    const head = block.split('\n')[0];
    const body = m[1];
    const startLine = src.slice(0, m.index).split('\n').length;
    const lineAt = (needle) => startLine + body.slice(0, body.indexOf(needle)).split('\n').length - 1;

    const decl = body.match(/\.(locals|registers)\s+(\d+)/);
    if (!decl) continue;
    const kind = decl[1];
    const declared = parseInt(decl[2], 10);
    const isStatic = / static /.test(head);
    const sigDesc = (head.match(/\((.*?)\)/) || [, ''])[1];
    const M = paramRegisters(sigDesc, isStatic);
    const total = kind === 'locals' ? declared + M : declared;
    const limit = total - M;

    // ---- 1. register overflow --------------------------------------------
    let maxV = -1;
    for (const r of body.matchAll(/\bv(\d+)\b/g)) maxV = Math.max(maxV, +r[1]);
    let maxP = -1;
    for (const r of body.matchAll(/\bp(\d+)\b/g)) maxP = Math.max(maxP, +r[1]);
    if (maxV >= limit) {
      push(rel, startLine,
        `register overflow in ${head.trim()} — uses v${maxV} but only v0..v${limit - 1} `
        + `are non-parameter (.${kind} ${declared}, ${M} param regs); this aliases a parameter`);
    }
    if (maxP >= M) {
      push(rel, startLine, `invalid param register p${maxP} in ${head.trim()} (only ${M} exist)`);
    }

    // ---- 2. constructor order --------------------------------------------
    if (/constructor\s+<init>/.test(head)) {
      const superCall = body.search(/-><init>\(/);
      const firstIput = body.search(/\biput(-\w+)?\b/);
      if (superCall !== -1 && firstIput !== -1 && firstIput < superCall) {
        push(rel, startLine, `field write before super() in ${head.trim()} — VerifyError at class load`);
      }
    }

    // ---- 6. duplicate labels ---------------------------------------------
    const seen = new Map();
    for (const lm of body.matchAll(/^\s*(:[\w]+)\s*$/gm)) {
      const name = lm[1];
      const ln = lineAt(lm[0].trim()) + 1;
      if (seen.has(name)) push(rel, ln, `duplicate label ${name} in ${head.trim()} (first at line ${seen.get(name)})`);
      else seen.set(name, ln);
    }

    // ---- 5. illegal move-exception ---------------------------------------
    // `move-exception` is only legal as the FIRST instruction of a declared
    // exception handler. It breaks if its label is not a .catch target, if that
    // label is also reachable via a branch, or if the instruction above can fall
    // through into it. ART rejects the whole class when this is wrong.
    const handlerTargets = new Set();
    for (const cm of body.matchAll(/\.catch\s+\S+\s+\{([^}]*)\}\s+(:\w+)/g)) {
      handlerTargets.add(cm[2]);
    }
    const lines = body.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*move-exception\b/.test(lines[i])) continue;
      const at = startLine + i;

      let p = i - 1;
      while (p >= 0 && (lines[p].trim() === '' || lines[p].trim().startsWith('#'))) p--;
      const labelMatch = (lines[p] || '').match(/^\s*(:\w+)\s*$/);

      if (!labelMatch) {
        push(rel, at, `move-exception in ${head.trim()} is not preceded by a label`);
        continue;
      }
      const lname = labelMatch[1];

      if (!handlerTargets.has(lname)) {
        push(rel, at,
          `move-exception in ${head.trim()} follows ${lname}, which is not a .catch target `
          + `(handlers: ${[...handlerTargets].join(', ') || 'none'})`);
        continue;
      }

      if (new RegExp(`(?:goto|if-\\w+)\\s+${lname}\\b`).test(body)) {
        push(rel, at, `exception handler ${lname} in ${head.trim()} is also a branch target`);
        continue;
      }

      let q = p - 1;
      while (q >= 0) {
        const s = lines[q].trim();
        // .catch / .end / labels / annotations are metadata, not instructions:
        // control cannot "fall through" them, so keep walking up to the last
        // real instruction.
        if (s === '' || s.startsWith('#') || s.startsWith('.catch') ||
            s.startsWith('.end') || s.startsWith('.annotation') ||
            s.startsWith('.line') || s.startsWith('.param') ||
            /^:\w+$/.test(s)) {
          q--;
          continue;
        }
        break;
      }
      const above = (lines[q] || '').trim();
      if (above && !/^(return|throw|goto)/.test(above)) {
        push(rel, at, `control falls through into exception handler ${lname} in ${head.trim()} (from "${above}")`);
      }
    }

    // ---- 4. wrong invoke arity -------------------------------------------
    for (const im of body.matchAll(/invoke-(?:virtual|direct|static|interface|super)\s+\{([^}]*)\}\s*,\s*(L[^\s;]+;->\S+)/g)) {
      const regList = im[1].split(',').map(s => s.trim()).filter(Boolean);
      const target = im[2].replace(/\s+$/, '');
      const ln = lineAt(im[0]) + 1;

      // Only check signatures we have explicitly confirmed. Guessing at
      // framework arity from a descriptor would produce false positives for
      // range/varargs forms we have not verified.
      const expected = KNOWN[target];
      if (expected === undefined) continue;

      // Long/double args may be passed as a /range or as a wide pair; accept
      // both by allowing regList.length to match the register count.
      if (regList.length !== expected) {
        push(rel, ln,
          `wrong invoke arity for ${target} in ${head.trim()} — passes ${regList.length} register(s), signature needs ${expected}`);
      }
    }

    // ---- 4b. arity / staticness of OUR OWN calls -------------------------
    // A wrong register count on an internal call is what ART reports as
    // "expected N argument registers, method signature has M".
    for (const im of body.matchAll(/invoke-(virtual|direct|static|interface|super)\s+\{([^}]*)\}\s*,\s*(L[^\s;]+;->\S+)/g)) {
      const kind = im[1];
      const n = im[2].split(',').map(s => s.trim()).filter(Boolean).length;
      const target = im[3].trim();
      const decl = signatures.get(target);
      if (!decl) continue; // framework method, covered by KNOWN above

      const ln = lineAt(im[0]) + 1;
      if ((kind === 'static') !== decl.isStatic) {
        push(rel, ln,
          `invoke-${kind} targets a ${decl.isStatic ? 'static' : 'instance'} method in ${head.trim()}: ${target}`);
      } else if (n !== decl.regs) {
        push(rel, ln,
          `wrong invoke arity in ${head.trim()} — ${target} needs ${decl.regs} register(s), call passes ${n}`);
      }
    }
  }
}

if (problems.length) {
  console.log(`${problems.length} PROBLEM(S):\n`);
  console.log(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log('smali checks passed:');
  console.log('  - no register overflow / parameter aliasing');
  console.log('  - constructors call super() first');
  console.log('  - no orphaned .registers');
  console.log('  - no duplicate labels');
  console.log('  - exception handlers are not branch targets');
  console.log('  - known framework calls pass the right number of registers');
  console.log('  - internal calls match signature arity and static/virtual');
}