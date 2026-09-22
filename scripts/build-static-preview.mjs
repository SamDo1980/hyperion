import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'quick-preview');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(root, 'src'), join(out, 'src'), { recursive: true });
await cp(join(root, 'public', 'assets'), join(out, 'assets'), { recursive: true });
await cp(join(root, 'public', 'favicon.png'), join(out, 'favicon.png'));

const sourceMain = await readFile(join(root, 'src', 'main.js'), 'utf8');
const css = [...sourceMain.matchAll(/^import ['"](\.\/styles\/[^'"]+\.css)['"];\s*$/gm)].map(match => match[1]);
let main = sourceMain
  .replace(/^import productsURL from ['"]\.\/data\/products\.json\?url['"];\s*$/m, "const productsURL = './src/data/products.json';")
  .replace(/^import familiesURL from ['"]\.\/data\/families\.json\?url['"];\s*$/m, "const familiesURL = './src/data/families.json';")
  .replace(/^import taxonomyURL from ['"]\.\/data\/taxonomy\.json\?url['"];\s*$/m, "const taxonomyURL = './src/data/taxonomy.json';")
  .replace(/^import configuratorURL from ['"]\.\/data\/configurator\.json\?url['"];\s*$/m, "const configuratorURL = './src/data/configurator.json';")
  .replace(/^import ['"]\.\/styles\/[^'"]+\.css['"];\s*$/gm, '');
await writeFile(join(out, 'src', 'main.js'), main);

// Direct browser modules do not get Vite's import.meta.env injection.
async function rewriteBase(path) {
  const text = await readFile(path, 'utf8');
  if (text.includes('import.meta.env.BASE_URL')) await writeFile(path, text.replaceAll('import.meta.env.BASE_URL', "'./'"));
}
for (const rel of ['components/header.js','components/order-completion.js','components/payment-modal.js']) await rewriteBase(join(out, 'src', rel));

const styleLinks = css.map(path => `    <link rel="stylesheet" href="./src/${path.slice(2)}" />`).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#082238" />
  <meta name="description" content="HYPERION marine and IMO safety signs by Handyman." />
  <title>HYPERION Marine Safety Signs | Handyman</title>
  <link rel="icon" type="image/png" href="./favicon.png" />
${styleLinks}
</head>
<body>
  <a class="skip-link" href="#product-query">Skip to product search</a>
  <div id="site-header"></div>
  <main id="main"><p class="container startup-message">Loading the HYPERION catalogue…</p></main>
  <div id="cart-feedback" class="toast" role="status" aria-live="polite" aria-atomic="true"></div>
  <noscript><p class="container">Enable JavaScript to search the HYPERION catalogue and add products to your cart.</p></noscript>
  <script type="module" src="./src/main.js"></script>
</body>
</html>`;
await writeFile(join(out, 'index.html'), html);
console.log('Static quick-preview generated from src/.');
