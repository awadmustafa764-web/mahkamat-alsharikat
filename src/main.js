import '@fontsource/aref-ruqaa/arabic-700.css';
import '@fontsource/aref-ruqaa/arabic-400.css';
import '@fontsource/aref-ruqaa-ink/arabic-400.css';
import '@fontsource/noto-naskh-arabic/arabic-400.css';
import '@fontsource/noto-naskh-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/landing.css';
import './styles/read.css';
import './styles/reading.css';

import { createStages } from './app/stages.js';
import * as landing from './stages/landing.js';
import * as intake from './stages/intake.js';
import * as reading from './stages/reading.js';
import { pageStage } from './stages/pages.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.getElementById('app');

const stages = createStages(root, {
  landing, reading, case: intake,
  method: pageStage('method'),
  limits: pageStage('limits'),
}, { reducedMotion });

await document.fonts.ready.catch(() => {});
stages.go('landing');
