const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'assets', 'showcase');
function browserLaunchOptions() {
  const configured = process.env.PLAYWRIGHT_BROWSER_PATH;
  const windowsCandidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  const executablePath = [configured, ...windowsCandidates].find((candidate) => candidate && fs.existsSync(candidate));
  return executablePath ? { headless: true, executablePath } : { headless: true };
}

const shots = [
  { input: 'final-readme-hero.html', output: 'readme-hero.png', width: 1920, height: 1080 },
  { input: 'final-social-preview.html', output: 'social-preview.png', width: 1280, height: 640 },
  { input: 'real-response-replica.html', output: 'real-response.png', width: 1440, height: 1080 },
  { input: 'historical-response-template.html?case=puyi', output: 'case-puyi.png', width: 1440, height: 1080 },
  { input: 'historical-response-template.html?case=einstein', output: 'case-einstein.png', width: 1440, height: 1080 },
  { input: 'historical-response-template.html?case=churchill', output: 'case-churchill.png', width: 1440, height: 1080 },
];

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch(browserLaunchOptions());
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const [inputFile, query] = shot.input.split('?');
    const inputUrl = `file:///${path.join(__dirname, inputFile).replace(/\\/g, '/')}${query ? `?${query}` : ''}`;
    await page.goto(inputUrl, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(outputDir, shot.output) });
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    process.stdout.write(`${shot.output}: ${dimensions.width}x${dimensions.height}; console errors: ${errors.length}\n`);
    await page.close();
  }
  await browser.close();
})();
