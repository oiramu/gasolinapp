/** Chrome sin ventana: el que usan los servicios que cargan el sitio en cada deploy. */
const HEADLESS_USER_AGENT = /HeadlessChrome/

export type BrowserInfo = Pick<Navigator, 'webdriver' | 'userAgent'>

/**
 * Navegador manejado por un programa (capturas de cada deploy, Puppeteer, Playwright).
 * Sus visitas no son uso real: no se miden.
 */
export function isAutomatedBrowser({ webdriver, userAgent }: BrowserInfo): boolean {
  return webdriver || HEADLESS_USER_AGENT.test(userAgent)
}
