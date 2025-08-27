declare module 'bun' {
  interface PluginBuilder {
    onEnd: (callback: (build: BuildOutput) => void | Promise<void>) => void
  }
}
