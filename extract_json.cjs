const fs = require('fs');
const transcriptPath = 'C:\\Users\\Thiago Manhães\\.gemini\\antigravity\\brain\\587708e0-b870-40fe-8507-3e9fa63dbed6\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  try {
    const line = JSON.parse(lines[i]);
    if (line.type === 'USER_INPUT' && line.source === 'USER_EXPLICIT' && line.content.includes('{"categories"')) {
      // Extract the JSON part
      const content = line.content;
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = content.substring(jsonStart, jsonEnd);
        fs.writeFileSync('C:\\Users\\Thiago Manhães\\Downloads\\priveloja\\dump.json', jsonStr);
        console.log('Successfully extracted JSON to dump.json');
        console.log('Length:', jsonStr.length);
        break;
      }
    }
  } catch (e) {
    // ignore parse errors
  }
}
