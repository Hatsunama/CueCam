# Security

Report suspected vulnerabilities privately to the repository owner instead of opening a public issue.

## Build dependency controls

Metro 0.84.4 depends on `image-size` 1.2.1. GitHub advisories GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq cover infinite loops in its ICNS, JXL, and HEIF parsers. No patched `image-size` release is currently available, and current Metro releases retain the dependency.

CueCam does not use these image formats. `metro.config.js` disables all affected parsers before Metro processes assets, and `npm run security:build` verifies that each affected input type fails closed. The check is included in `npm run check`.

The `xcode` build dependency is constrained to patched `uuid` 11.1.1. Its `uuid.v4()` integration is covered by clean installation, Expo Doctor, and production export validation.

Do not use `npm audit fix --force`; its proposed Expo and React Native downgrades are incompatible with Expo SDK 57.
