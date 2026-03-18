export {};

declare global {
  // eslint-disable-next-line no-var
  var __SPELLCHECK_BASE_URL__: string;
  // eslint-disable-next-line no-var
  var __SPELLCHECK_API_KEY__: string;
}

globalThis.__SPELLCHECK_BASE_URL__ = 'https://api.kiyanaw.dev';
globalThis.__SPELLCHECK_API_KEY__ = 'test-key';
