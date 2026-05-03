const fs = require('fs');
const path = require('path');

const voronoiFiles = ['v2.svg', 'v3.svg', 'v4.svg'];
const publicDir = 'c:\\Users\\SETS\\PROJECTS\\simpleredirect\\public\\voronoi';
const outputDir = 'c:\\Users\\SETS\\PROJECTS\\simpleredirect\\public\\voronoi\\separated';

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

    // Find all paths
    const pathRegex = /<path[^>]+id="([^"]+)"[^>]*d="([^"]+)"[^>]*>/g;
    let match;
    const paths = [];

    while ((match = pathRegex.exec(content)) !== null) {
        const originalId = match[1];
        const d = match[2];
        
        // Split merged paths
        const subPaths = d.split(/(?=M)/).map(p => p.trim()).filter(p => p.length > 0);
        subPaths.forEach((subD, index) => {
            paths.push({
                originalId: originalId,
                subIndex: index,
                d: subD,
                // Inherit other attributes from the original path regex if needed, 
                // but let's just keep it simple.
            });
        });
    }

    // Build the new SVG content
    let newPathsGroup = '  <g id="SeparatedCells">\n';
    const labels = [];
    let globalCounter = 1;

    paths.forEach((p, idx) => {
        const cellId = globalCounter++;
        const points = getPathPoints(p.d);
        
        if (points.length > 0) {
            const sumX = points.reduce((sum, pt) => sum + pt.x, 0);
            const sumY = points.reduce((sum, pt) => sum + pt.y, 0);
            labels.push({ id: cellId, x: sumX / points.length, y: sumY / points.length, originalId: p.originalId });
        }

        // Use a default color cycle or just inherit from original?
        // Let's use a simple opacity-based color.
        const color = `rgba(255, 96, 0, 0.15)`; // DDU Orange
        newPathsGroup += `    <path id="cell-${cellId}" data-original="${p.originalId}" d="${p.d}" stroke="#ffffff" stroke-width="2" fill="${color}" />\n`;
    });
    newPathsGroup += '  </g>\n';

    let labelGroup = '  <g id="Labels" style="pointer-events: none;">\n';
    labels.forEach(lbl => {
        labelGroup += `    <text x="${lbl.x}" y="${lbl.y}" font-family="Arial, sans-serif" font-size="100" font-weight="bold" fill="white" stroke="black" stroke-width="3" text-anchor="middle" dominant-baseline="middle">${lbl.id}</text>\n`;
        // Also add a small subtitle with the original ID if it was merged
        labelGroup += `    <text x="${lbl.x}" y="${lbl.y + 60}" font-family="Arial, sans-serif" font-size="30" fill="#ff6000" text-anchor="middle" dominant-baseline="middle">${lbl.originalId}</text>\n`;
    });
    labelGroup += '  </g>\n';

    // Replace the old group or paths with the new ones
    // We'll just strip out the existing <g id="NeueCells">... </g> or individual paths
    content = content.replace(/<g id="NeueCells">[\s\S]*?<\/g>/, newPathsGroup + labelGroup);
    
    // Fallback if it wasn't in a group
    if (!content.includes('id="SeparatedCells"')) {
        content = content.replace(/<path[\s\S]*?\/>/g, ''); // Remove all paths
        content = content.replace('</svg>', newPathsGroup + labelGroup + '</svg>');
    }

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, content);
    console.log(`Generated ${outputPath}`);
});
