"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const VENDOR = path.join(ROOT, "vendor/node-forge-patched");
const ORIGINAL_RSA = "fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50";
const UPSTREAM_PATCH_RSA =
  "acc22e5d36e27832c34e02dd3933aad7977d45b047eead5016520735efedc9c5";
const NULL_ONLY_RSA = "17d78037b133e363454173728fb76e57ed16897350956c82c52c51ff5d053c57";
const PATCHED_RSA = "5b8cc269824047324b36a681d3482dc3002e04fc99ae40c63c5c0440537e1493";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
let passed = 0;
function check(name, action) {
  action();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

const manifestBytes = fs.readFileSync(path.join(VENDOR, "UPSTREAM_SHA256.json"));
assert.equal(
  sha256(manifestBytes),
  "021ff05fff16b080c589c60c36b3fb8904710170168c6e93972303094df54e9b"
);
const upstreamHashes = JSON.parse(manifestBytes);
function verifyTree(directory) {
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, "package.json")));
  assert.equal(metadata.name, "node-forge");
  assert.equal(metadata.version, "1.4.0+growpath.1");
  assert.equal(metadata.growpathSecurityPatch.baseVersion, "1.4.0");
  assert.equal(
    metadata.growpathSecurityPatch.upstreamCommit,
    "ceba34402e329f0365134f23fe19898756527d65"
  );
  const names = fs.readdirSync(path.join(directory, "lib")).sort();
  assert.deepEqual(names, Object.keys(upstreamHashes).sort());
  for (const name of names) {
    assert.equal(
      sha256(fs.readFileSync(path.join(directory, "lib", name))),
      name === "rsa.js" ? PATCHED_RSA : upstreamHashes[name],
      name
    );
  }
  assert.equal(
    sha256(fs.readFileSync(path.join(directory, "LICENSE"))),
    "30f05ceb5424e91bc4014ec6323f482920356d97e49ada934765d10db282637e"
  );
}
check("all 49 source files, honest metadata and license have expected integrity", () =>
  verifyTree(VENDOR)
);

let target = VENDOR;
if (process.argv.includes("--installed")) {
  target = path.dirname(require.resolve("node-forge/package.json", { paths: [ROOT] }));
  check("installed node-forge resolves to the verified patched source", () =>
    verifyTree(target)
  );
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "package-lock.json")));
  const installedPaths = Object.entries(lock.packages).filter(
    ([relativePath, entry]) =>
      /(?:^|\/)node_modules\/node-forge$/.test(relativePath) ||
      (relativePath.includes("node_modules/") && entry.name === "node-forge")
  );
  assert.ok(installedPaths.length > 0, "Lockfile must record installed node-forge");
  for (const [relativePath] of installedPaths) {
    check(`all installed node-forge copies: ${relativePath}`, () =>
      verifyTree(path.join(ROOT, relativePath))
    );
  }
}
const forge = require(target);
const patchedSource = fs.readFileSync(path.join(VENDOR, "lib/rsa.js"), "utf8");
const oidHardening = [
  "          // GrowPathAI hardening (2026-10-05): do not let derToOid discard",
  "          // unfinished arcs or normalize non-minimal base-128 encodings.",
  "          if(capture.algorithmIdentifier !== asn1.oidToDer(oid).getBytes()) {",
  "            throw new Error(",
  "              'Invalid RSASSA-PKCS1-v1_5 DigestAlgorithm identifier encoding.');",
  "          }",
  ""
].join("\n");
const nullOnlySource = patchedSource.replace(oidHardening, "");
assert.equal(sha256(nullOnlySource), NULL_ONLY_RSA, "NULL-only control source integrity");
const nullHardening = [
  "              (('parameters' in capture) ? 2 : 1) ||",
  "            // GrowPathAI hardening (2026-10-05): ASN.1 NULL has no payload.",
  "            // Otherwise interior garbage still fits in exactly two children.",
  "            ('parameters' in capture && capture.parameters !== '')) {"
].join("\n");
const upstreamSource = nullOnlySource.replace(
  nullHardening,
  "              (('parameters' in capture) ? 2 : 1)) {"
);
assert.equal(
  sha256(upstreamSource),
  UPSTREAM_PATCH_RSA,
  "upstream-only control must match the fetched PR source"
);
const upstreamHunk = [
  "// validate DigestInfo structure and element counts (outer DigestInfo",
  "          // and nested DigestAlgorithm). asn1.validate ignores extra children,",
  "          // so length must be checked explicitly at each nesting level to",
  "          // prevent low-exponent PKCS#1 v1.5 signature forgery (CVE-2026-85393).",
  "          var capture = {};",
  "          var errors = [];",
  "          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||",
  "            obj.value.length !== 2 ||",
  "            obj.value[0].value.length !==",
  "              (('parameters' in capture) ? 2 : 1)) {"
].join("\n");
const originalHunk = [
  "// validate DigestInfo structure and element count",
  "          var capture = {};",
  "          var errors = [];",
  "          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||",
  "            obj.value.length !== 2) {"
].join("\n");
const originalSource = upstreamSource.replace(upstreamHunk, originalHunk);
assert.equal(
  sha256(originalSource),
  ORIGINAL_RSA,
  "original control must match the original 1.4.0 source"
);

// Isolate control versions entirely in memory. Never mutate installed sources or
// leave an unpatched runtime file on disk. All dependencies remain identical.
function loadControl(rsaSource) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename);
    cache.set(filename, mod);
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    const normalRequire = Module.createRequire(filename);
    mod.require = (request) =>
      request.startsWith("./")
        ? load(normalRequire.resolve(request))
        : normalRequire(request);
    mod._compile(
      path.basename(filename) === "rsa.js"
        ? rsaSource
        : fs.readFileSync(filename, "utf8"),
      filename
    );
    mod.loaded = true;
    return mod.exports;
  }
  return load(path.join(VENDOR, "lib/index.js"));
}
const original = loadControl(originalSource);
const upstreamOnly = loadControl(upstreamSource);
const nullOnly = loadControl(nullOnlySource);
const a = forge.asn1;
const sequence = (children) =>
  a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, children);
const octets = (value) => a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, false, value);
const nullValue = (value = "") => a.create(a.Class.UNIVERSAL, a.Type.NULL, false, value);
const oid = (algorithm = "sha256") =>
  a.create(
    a.Class.UNIVERSAL,
    a.Type.OID,
    false,
    a.oidToDer(forge.oids[algorithm]).getBytes()
  );
const message = Buffer.from(
  "GrowPathAI synthetic signature regression; no real credentials."
);
const digest = crypto.createHash("sha256").update(message).digest("binary");
function digestInfo(children = [oid(), nullValue()], hash = digest) {
  return sequence([sequence(children), octets(hash)]);
}
function derSignature(key, structure, suffix = "") {
  return crypto
    .privateEncrypt(
      { key, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(a.toDer(structure).getBytes() + suffix, "binary")
    )
    .toString("binary");
}
function rejectsSignature(publicKey, signature, expectedDigest = digest) {
  let accepted = false;
  try {
    accepted = publicKey.verify(expectedDigest, signature);
  } catch (error) {
    assert.ok(error instanceof Error);
  }
  assert.equal(accepted, false, "malformed signature must never verify");
}

for (const exponent of [3, 65537]) {
  const keys = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicExponent: exponent
  });
  const publicPem = keys.publicKey.export({ type: "spki", format: "pem" });
  const privatePem = keys.privateKey.export({ type: "pkcs8", format: "pem" });
  const publicKey = forge.pki.publicKeyFromPem(publicPem);
  const privateKey = forge.pki.privateKeyFromPem(privatePem);
  const originalPublic = original.pki.publicKeyFromPem(publicPem);
  const upstreamPublic = upstreamOnly.pki.publicKeyFromPem(publicPem);
  const nullOnlyPublic = nullOnly.pki.publicKeyFromPem(publicPem);
  const extraChild = derSignature(
    keys.privateKey,
    digestInfo([oid(), nullValue(), octets("interior garbage")])
  );
  const nonemptyNull = derSignature(
    keys.privateKey,
    digestInfo([oid(), nullValue("interior garbage")])
  );
  check(`e=${exponent}: original 1.4.0 control reproduces nested-child acceptance`, () =>
    assert.equal(originalPublic.verify(digest, extraChild), true)
  );
  check(
    `e=${exponent}: upstream-only control rejects extra child but accepts nonempty NULL`,
    () => {
      rejectsSignature(upstreamPublic, extraChild);
      assert.equal(upstreamPublic.verify(digest, nonemptyNull), true);
    }
  );
  const canonicalOid = a.oidToDer(forge.oids.sha256).getBytes();
  for (const [name, bytes] of [
    ["unterminated OID arc", canonicalOid + "\x80"],
    ["long unterminated OID arc", canonicalOid + "\x80".repeat(100)],
    ["non-minimal OID arc", canonicalOid.slice(0, 1) + "\x80" + canonicalOid.slice(1)]
  ]) {
    check(`e=${exponent}: ${name} accepted by controls, rejected by final patch`, () => {
      const malformedOid = a.create(a.Class.UNIVERSAL, a.Type.OID, false, bytes);
      const signature = derSignature(
        keys.privateKey,
        digestInfo([malformedOid, nullValue()])
      );
      assert.equal(originalPublic.verify(digest, signature), true);
      assert.equal(upstreamPublic.verify(digest, signature), true);
      assert.equal(nullOnlyPublic.verify(digest, signature), true);
      rejectsSignature(publicKey, signature);
    });
  }
  for (const algorithm of ["sha1", "sha224", "sha256", "sha384", "sha512", "md5"]) {
    check(`e=${exponent}: ${algorithm} native valid signature and wrong message`, () => {
      const signature = crypto
        .sign(algorithm, message, keys.privateKey)
        .toString("binary");
      const hash = crypto.createHash(algorithm).update(message).digest("binary");
      assert.equal(publicKey.verify(hash, signature), true);
      rejectsSignature(
        publicKey,
        signature,
        crypto.createHash(algorithm).update("wrong message").digest("binary")
      );
    });
  }
  check(`e=${exponent}: valid SHA256 absent or empty NULL preserved`, () => {
    for (const children of [[oid()], [oid(), nullValue()]]) {
      assert.equal(
        publicKey.verify(digest, derSignature(keys.privateKey, digestInfo(children))),
        true
      );
    }
  });
  const invalid = [
    [
      "OID NULL extra OCTET STRING",
      digestInfo([oid(), nullValue(), octets("interior garbage")])
    ],
    ["OID unexpected OCTET STRING", digestInfo([oid(), octets("interior garbage")])],
    ["OID NULL extra NULL", digestInfo([oid(), nullValue(), nullValue()])],
    ["NULL interior garbage", digestInfo([oid(), nullValue("interior garbage")])],
    ["NULL single zero byte", digestInfo([oid(), nullValue("\x00")])],
    ["NULL long interior payload", digestInfo([oid(), nullValue("G".repeat(120))])],
    ["outer extra element", sequence([...digestInfo().value, octets("garbage")])],
    ["missing algorithm", sequence([sequence([]), octets(digest)])],
    [
      "constructed NULL",
      digestInfo([oid(), a.create(a.Class.UNIVERSAL, a.Type.NULL, true, [])])
    ],
    [
      "constructed digest",
      sequence([
        sequence([oid(), nullValue()]),
        a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, true, [octets(digest)])
      ])
    ]
  ];
  for (const [name, structure] of invalid) {
    check(`e=${exponent}: rejects ${name}`, () =>
      rejectsSignature(publicKey, derSignature(keys.privateKey, structure))
    );
  }
  check(`e=${exponent}: trailing bytes remain rejected`, () =>
    rejectsSignature(publicKey, derSignature(keys.privateKey, digestInfo(), "garbage"))
  );
  check(`e=${exponent}: PKCS1 signing remains interoperable with Node`, () => {
    const md = forge.md.sha256.create();
    md.update(message.toString("binary"));
    assert.equal(
      crypto.verify(
        "sha256",
        message,
        keys.publicKey,
        Buffer.from(privateKey.sign(md), "binary")
      ),
      true
    );
  });
  check(`e=${exponent}: RSA-PSS native verification still works`, () => {
    const signature = crypto.sign("sha256", message, {
      key: keys.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32
    });
    const pss = forge.pss.create({
      md: forge.md.sha256.create(),
      mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
      saltLength: 32
    });
    assert.equal(publicKey.verify(digest, signature.toString("binary"), pss), true);
  });
  check(`e=${exponent}: RSA-OAEP roundtrip remains interoperable`, () => {
    const encrypted = publicKey.encrypt(message.toString("binary"), "RSA-OAEP");
    assert.deepEqual(
      crypto.privateDecrypt(
        { key: keys.privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
        Buffer.from(encrypted, "binary")
      ),
      message
    );
    const nativeEncrypted = crypto.publicEncrypt(
      { key: keys.publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      message
    );
    assert.equal(
      privateKey.decrypt(nativeEncrypted.toString("binary"), "RSA-OAEP"),
      message.toString("binary")
    );
  });
  check(`e=${exponent}: X509 self-signed certificate accepted by Forge and Node`, () => {
    const cert = forge.pki.createCertificate();
    cert.publicKey = publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date("2026-01-01T00:00:00Z");
    cert.validity.notAfter = new Date("2027-01-01T00:00:00Z");
    const attributes = [{ name: "commonName", value: "synthetic.invalid" }];
    cert.setSubject(attributes);
    cert.setIssuer(attributes);
    cert.sign(privateKey, forge.md.sha256.create());
    assert.equal(cert.verify(cert), true);
    const pem = forge.pki.certificateToPem(cert);
    assert.equal(new crypto.X509Certificate(pem).verify(keys.publicKey), true);
    const loaded = forge.pki.certificateFromPem(pem);
    assert.equal(loaded.verify(loaded), true);
    loaded.signature =
      String.fromCharCode(loaded.signature.charCodeAt(0) ^ 1) + loaded.signature.slice(1);
    let accepted = false;
    try {
      accepted = cert.verify(loaded);
    } catch (error) {
      assert.ok(error instanceof Error);
    }
    assert.equal(accepted, false);
  });
  check(`e=${exponent}: certificate signing request roundtrip`, () => {
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = publicKey;
    csr.setSubject([{ name: "commonName", value: "synthetic.invalid" }]);
    csr.sign(privateKey, forge.md.sha256.create());
    assert.equal(
      forge.pki
        .certificationRequestFromPem(forge.pki.certificationRequestToPem(csr))
        .verify(),
      true
    );
  });
}

process.stdout.write(`Verified node-forge backport: ${passed} checks passed.\n`);
