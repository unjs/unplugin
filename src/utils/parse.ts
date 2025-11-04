let parseImpl: ((code: string, opts?: any) => any) | undefined

export function parse(code: string, opts: any = {}): any {
  if (!parseImpl) {
    throw new Error('Parse implementation is not set. Please call setParseImpl first.')
  }
  return parseImpl(code, opts)
}

export function setParseImpl(
  customParse: (code: string, opts?: any) => any,
): void {
  parseImpl = customParse
}
