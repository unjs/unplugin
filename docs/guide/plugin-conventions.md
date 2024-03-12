---
aside: false
lastUpdated: false
---

# Plugin Conventions

To have a better community and ecosystem, we encourage plugin authors to follow these conventions when creating unplugins.

- Plugins powered by Unplugin should have a clear name with `unplugin-` prefix.
- Include `unplugin` keyword in `package.json`.
- To provide better DX, packages could export 2 kinds of entry points:
  - Default export: the returned value of `createUnplugin` function

    ```ts
    import UnpluginFeature from 'unplugin-feature'
    ```

  - Subpath exports: properties of the returned value of `createUnplugin` function for each bundler users

    ```ts
    import VitePlugin from 'unplugin-feature/vite'
    ```

  - Refer to [unplugin-starter](https://github.com/unplugin/unplugin-starter) for more details about this setup.
