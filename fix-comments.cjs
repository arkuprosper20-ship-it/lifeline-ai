const fs = require('fs');
const path = require('path');

const commentMap = {
  'store': 'State Manager',
  'main': 'Main entry point and router',
  'analyzer': 'Incident Analysis Engine (local fallback + AI router)',
  'maplibre': 'Vector tile support for MapLibre GL JS',
  'map-helpers': 'Map helpers and utilities',
  'location': 'Location and geolocation utilities',
  'contacts': 'Contact directory and escalation logic',
  'notification-providers': 'Notification provider abstraction',
  'sync': 'Offline sync queue',
  'reports': 'After-action report generation',
  'sla': 'SLA tracking and escalation timers',
  'ws': 'WebSocket real-time sync',
  'indexeddb': 'IndexedDB storage layer',
  'crypto': 'Encryption utilities',
  'i18n': 'Multi-language support',
  'auth': 'Authentication',
  'handlers': 'Global event handlers',
  'ui': 'UI helper utilities',
  'voice': 'Voice recording and speech recognition',
  'emergency-contacts': 'Emergency contact utilities',
  'types': 'Core types and constants',
  'map': 'Map screen (MapLibre vector tiles + Leaflet fallback)',
  'report': 'Report screen',
  'analysis': 'Analysis screen (AI processing view)',
  'incident-brief': 'Incident brief view',
  'location-screen': 'Location capture screen',
  'escalation': 'Escalation screen',
  'confirm': 'Confirmation screen',
  'delivery-status': 'Delivery status screen',
  'history': 'History screen',
  'settings': 'Settings screen',
  'contacts-admin': 'Contacts admin screen',
  'coordination': 'Coordination dashboard',
  'audit': 'Audit log screen',
  'about': 'About screen',
  'privacy': 'Privacy screen',
  'help': 'Help screen',
  'auth': 'Auth screen',
  'setup-wizard': 'Setup wizard screen',
  'analyze': 'Analysis flow (AI router + rules engine)',
  'notify': 'Notification API handler',
  'twilio-webhook': 'Twilio webhook handler',
  'message-status': 'Message delivery status API',
};

const dirs = [
  'D:\\lifeline-ai\\src',
  'D:\\lifeline-ai\\src\\views',
  'D:\\lifeline-ai\\src\\flows',
  'D:\\lifeline-ai\\api'
];

dirs.forEach(dir => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lines[0].match(/^\/\/ LIFELINE AI - $/)) {
      const filename = path.basename(file, path.extname(file));
      const comment = commentMap[filename];
      if (comment) {
        lines[0] = '// LIFELINE AI - ' + comment;
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log('Fixed:', filePath, '->', lines[0]);
      } else {
        console.log('No comment map for:', filename, 'in', filePath);
      }
    }
  });
});

console.log('Done');