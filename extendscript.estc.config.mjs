export default {
  host: 'illustrator',
  hostTypes: 'Illustrator/2022',
  entry: 'src/jsx-entry.ts',
  outfile: 'dist/ESRAND.estc.jsx',
  globalName: '__ESRAND_ENTRY__',
  target: 'illustrator',
  requireTarget: false,
  sourceLint: true,
  typecheck: true,
  normalize: true,
  compatibilityTransforms: ['esbuild'],
  compatibilityShims: [],
  allowedMissingBuiltins: [],
  allowedGlobalPatches: [],
  prelude: [],
  footer: [
    { code: 'var ESRAND = __ESRAND_ENTRY__.makeFacade();' }
  ],
  allowJson: false,
  allowIncludes: false,
  live: false,
  liveLaunch: false
};
