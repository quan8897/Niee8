const fs = require('fs');
const content = fs.readFileSync('c:/Users/ACER/Downloads/dự án kinh doanh quần áo/Niee8_temp/src/components/AdminDashboard.tsx', 'utf8');

let openBraces = 0;
let openParens = 0;
let openBrackets = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') openBraces++;
    else if (char === '}') openBraces--;
    else if (char === '(') openParens++;
    else if (char === ')') openParens--;
    else if (char === '[') openBrackets++;
    else if (char === ']') openBrackets--;
    
    // Check if anything drops below 0 prematurely (might indicate a mismatch but not always)
}

console.log(`Braces: ${openBraces}, Parens: ${openParens}, Brackets: ${openBrackets}`);
