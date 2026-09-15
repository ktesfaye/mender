import type { Configuration } from 'electron-builder';

/**
 * What it takes to be an app somebody installs.
 *
 * Deliberately smaller than upstream's. There is no publishing here, no update
 * channel and no notarisation: this is his own village on his own machine, and
 * a release pipeline is something to add when there is somebody to release to.
 * Everything that is here is here because the app does not run without it.
 */
const config: Configuration = {
  appId: 'dev.kirubel.mender',
  productName: 'Mender',
  executableName: 'Mender',
  directories: { output: 'release', buildResources: 'build' },
  artifactName: 'Mender-${version}-${arch}.${ext}',
  // Nothing is published from here. A build makes a thing you drag in.
  publish: null,
  // `assets` as well as `out`: main reads the world's own files from there.
  files: ['out/**/*', 'assets/**/*', 'node_modules/**/*'],
  /* The compiled binaries have to be real files, because an operating system
     will not load one out of an archive. Only those: pulling a whole package
     out and leaving what it imports inside is a package that resolves to half
     of itself, and that is what a village with nothing behind it looks like.
     Electron reads the archive itself, so everything that is javascript stays
     in it and a worker spawned from in there loads exactly as it does in
     development. */
  asarUnpack: ['**/*.node'],
  mac: {
    category: 'public.app-category.developer-tools',
    hardenedRuntime: true,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    icon: 'build/icon.icns',
    target: [{ target: 'dmg', arch: ['arm64'] }],
    notarize: false,
    extendInfo: {
      NSLocalNetworkUsageDescription: 'Mender reaches agents and hosts on your network.',
    },
  },
  dmg: {
    window: { width: 520, height: 320 },
    contents: [
      { x: 130, y: 150, type: 'file' },
      { x: 390, y: 150, type: 'link', path: '/Applications' },
    ],
  },
};

export default config;
