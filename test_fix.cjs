const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
if (content.includes('className={cn("w-full h-full block pointer-events-none", className)}')) {
    console.log("Replaced successfully!");
} else {
    console.log("Not replaced correctly.");
}
