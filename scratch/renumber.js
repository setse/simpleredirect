const fs = require('fs');
const path = require('path');

const voronoiFiles = ['v2.svg', 'v3.svg', 'v4.svg'];
const publicDir = 'c:\\Users\\SETS\\PROJECTS\\simpleredirect\\public\\voronoi';
const outputDir = 'c:\\Users\\SETS\\PROJECTS\\simpleredirect\\public\\voronoi\\numbered';

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function getPathPoints(d) {
    const points = [];
    const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
    let match;
    while ((match = commandRegex.exec(d)) !== null) {
        const command = match[1];
        const args = match[2].trim().split(/[ ,]+/).map(parseFloat).filter(n => !isNaN(n));
        
        if (command.toUpperCase() === 'M' || command.toUpperCase() === 'L') {
            for (let i = 0; i < args.length - 1; i += 2) {
                points.push({ x: args[i], y: args[i+1] });
            }
        } else if (command.toUpperCase() === 'A') {
            for (let i = 0; i < args.length - 6; i += 7) {
                points.push({ x: args[i+5], y: args[i+6] });
            }
        }
    }
    return points;
}

voronoiFiles.forEach(filename => {
    const filePath = path.join(publicDir, filename);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    const pathRegex = /<path[^>]+id="cell-(\d+)"[^>]*d="([^"]+)"[^>]*>/g;
    let match;
    const labels = [];

    while ((match = pathRegex.exec(content)) !== null) {
        const cellId = match[1];
        const d = match[2];
        const points = getPathPoints(d);
        
        if (points.length > 0) {
            const sumX = points.reduce((sum, p) => sum + p.x, 0);
            const sumY = points.reduce((sum, p) => sum + p.y, 0);
            labels.push({ id: cellId, x: sumX / points.length, y: sumY / points.length });
        }
    }

    // Replace the labels group
    let labelGroup = '\n  <g id="Labels" style="pointer-events: none;">\n';
    labels.forEach(lbl => {
        labelGroup += `    <text x="${lbl.x}" y="${lbl.y}" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" stroke="black" stroke-width="4" text-anchor="middle" dominant-baseline="middle">${lbl.id}</text>\n`;
    });
    labelGroup += '  </g>\n';

    // Remove old Labels if exist
    content = content.replace(/<g id="Labels"[\s\S]*?<\/g>\s*/, '');
    
    // Fallback if there was no group
    if (!content.includes('id="Labels"')) {
        content = content.replace('</svg>', labelGroup + '</svg>');
    }

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, content);
    console.log(`Generated ${outputPath}`);
});
