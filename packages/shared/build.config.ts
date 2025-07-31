import { defineBuildConfig } from 'unbuild'
import pkg from './package.json'

export default defineBuildConfig({
  replace: {
    __ORPC_SHARED_PACKAGE_NAME_PLACEHOLDER__: pkg.name,
    __ORPC_SHARED_PACKAGE_VERSION_PLACEHOLDER__: pkg.version,
  },
})
