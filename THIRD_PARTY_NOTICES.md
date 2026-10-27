# Third-party software

Original code in `src/` and `test/` was independently written for this package and is MIT licensed. No competing Actor source or Galaxy Con application core is included.

Runtime dependency: **Apify JS SDK 3.7.0**, Apache License 2.0. Project: https://github.com/apify/apify-sdk-js. Installed original license: `node_modules/apify/LICENSE.md`. The dependency remains a dependency and is not relicensed under MIT. `npm ci` installs its license along with the package. Respect Apache-2.0 notice, license, modification and patent provisions when redistributing that SDK.

`package-lock.json` pins the full dependency tree. Transitive packages carry their own licenses, which remain authoritative in their installed distributions. A machine-readable license manifest is included as `dependency-licenses.json`; investigate any unusual license before publishing a redistributed dependency bundle. `node_modules` is excluded from this source repository and Docker build context; the Docker build installs the locked dependency tree.

Specific transitive notices checked: `map-stream@0.1.0` lacks a package.json license field, but its installed `LICENCE` contains the MIT permission and Dominic Tarr's 2011 copyright. `caniuse-lite@1.0.30001819` is CC-BY-4.0; source https://github.com/browserslist/caniuse-lite, full license retained by npm in its installed `LICENSE`. No changes to that data were made. `pause-stream@0.0.11` declares MIT/Apache2 in its package metadata; its package's own terms continue to govern. These are SDK transitive dependencies, not copied source.

The official `apify/actor-node:22` base image includes additional software under its own terms. This project does not claim to relicense the base image. Official documentation was consulted for API contracts, not copied as product content. Examples are synthetic and contain no third-party notice text.
