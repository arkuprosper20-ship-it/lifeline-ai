const fs = require('fs');
const path = require('path');

const commentMap = {
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
  'D:\\lifeline-ai\\src\\views',
  'D:\\lifeline-ai\\src\\flows',
  'D:\\lifeline-ai\\api'
];

dirs.forEach(dir => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
  files.forEach(file => {
    const filePath = path.join(dir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      if (lines[0].match(/^\/\/ LIFELINE AI - $/)) {
        const filename = path.basename(file, path.extname(file));
        const comment = commentMap[filename];
        if (comment) {
          lines[0] = '// LIFELINE AI - ' + comment;
          fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
          console.log('Fixed:', filePath);
        }
      }
    } catch (e) {
      console.error('Error with', filePath, ':', e.message);
    }
  });
});

console.log('Done');