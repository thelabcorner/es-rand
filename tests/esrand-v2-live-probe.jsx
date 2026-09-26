(function () {
  var projectDir = File($.fileName).parent.parent;
  var standaloneFile = File(projectDir.fsName + "/dist/ESRAND.jsx");
  var standaloneMinFile = File(projectDir.fsName + "/dist/ESRAND.min.jsx");
  var vendorFile = File(projectDir.fsName + "/dist/vendor-esrand.js");
  var vendorMinFile = File(projectDir.fsName + "/dist/vendor-esrand.min.js");
  var previous = $.global.ESRAND;
  var checks = 0;
  var result = "";

  function assertTrue(value, label) {
    if (!value) throw new Error("ESRAND V2 live check failed: " + label);
    checks++;
  }

  function assertEq(actual, expected, label) {
    if (actual !== expected) {
      throw new Error("ESRAND V2 live check failed: " + label + " expected=" + expected + " actual=" + actual);
    }
    checks++;
  }

  function assertArray(actual, expected, label) {
    var i;
    assertEq(actual.length, expected.length, label + " length");
    for (i = 0; i < expected.length; i++) assertEq(actual[i], expected[i], label + "[" + i + "]");
  }

  function vector(R) {
    var r = R.fromState([1,2,3,4]);
    var out = [], i;
    for (i = 0; i < 8; i++) out[i] = r.uint32();
    return out;
  }

  function stateWords(R) {
    var s = R.getState();
    return [s.state[0], s.state[1], s.state[2], s.state[3]];
  }

  function freshLoad(file, label) {
    if (!file.exists) throw new Error("ESRAND artifact missing: " + file.fsName);
    $.global.ESRAND = void 0;
    $.evalFile(file);
    var R = $.global.ESRAND;
    assertTrue(R && typeof R.create === "function" && typeof R.bytes === "function", label + " facade loads");
    assertTrue(typeof ESRAND !== "undefined" && ESRAND === R, label + " bare global binding");
    assertEq(R.version(), "0.1.0", label + " version");
    var algorithm = R.algorithm();
    assertEq(algorithm.id, "xoshiro128**", label + " algorithm id");
    assertEq(algorithm.version, 1, label + " algorithm version");
    assertEq(algorithm.seedVersion, 1, label + " seed version");
    assertArray(vector(R), [11520,0,5927040,70819200,2031721883,1637235492,1287239034,3734860849], label + " canonical vector");
    return R;
  }

  try {
    var standalone = freshLoad(standaloneFile, "standalone");
    var standaloneMin = freshLoad(standaloneMinFile, "standalone minified");
    var vendor = freshLoad(vendorFile, "vendor");

    vendor.reseed("v2-reload-preserve");
    vendor.uint32();
    var before = stateWords(vendor);
    $.evalFile(vendorFile);
    var vendorReloaded = $.global.ESRAND;
    var after = stateWords(vendorReloaded);
    assertTrue(vendor === vendorReloaded, "same-version reload preserves facade identity");
    assertArray(after, before, "same-version reload preserves state");

    var vendorMin = freshLoad(vendorMinFile, "vendor minified");
    assertTrue(standalone !== standaloneMin && standaloneMin !== vendor && vendor !== vendorMin, "fresh loads produce independent facades");

    result = "ESRAND_V2_LIVE_PASS|" + checks + "|Illustrator=" + app.version + "|ExtendScript=" + $.version;
  } finally {
    $.global.ESRAND = previous;
  }

  return result;
}());
