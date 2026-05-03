const fs = require('fs');
const path = require('path');

const publicDir = 'c:\\Users\\SETS\\PROJECTS\\simpleredirect\\public\\voronoi';

// Helper to split a path by M while retaining M
function splitPathByM(d) {
    return d.split(/(?=M)/).map(p => p.trim()).filter(p => p.length > 0);
}

// Helper to find the rightmost subpath
function findRightmostSubpath(subPaths) {
    let maxCenterX = -Infinity;
    let rightmostIdx = -1;

    subPaths.forEach((subD, idx) => {
        const points = [];
        const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
        let match;
        while ((match = commandRegex.exec(subD)) !== null) {
            const command = match[1];
            const args = match[2].trim().split(/[ ,]+/).map(parseFloat).filter(n => !isNaN(n));
            
            if (command.toUpperCase() === 'M' || command.toUpperCase() === 'L') {
                for (let i = 0; i < args.length - 1; i += 2) points.push({ x: args[i] });
            } else if (command.toUpperCase() === 'A') {
                for (let i = 0; i < args.length - 6; i += 7) points.push({ x: args[i+5] });
            }
        }
        
        if (points.length > 0) {
            const centerX = points.reduce((sum, pt) => sum + pt.x, 0) / points.length;
            if (centerX > maxCenterX) {
                maxCenterX = centerX;
                rightmostIdx = idx;
            }
        }
    });

    return rightmostIdx;
}

// Process v3.svg
function applyV3() {
    const filePath = path.join(publicDir, 'v3.svg');
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // Find cell-4
    const pathRegex = /<path[^>]+id="cell-4"[^>]*d="([^"]+)"([^>]*)>/;
    const match = pathRegex.exec(content);
    
    if (match) {
        const d = match[1];
        const restAttrs = match[2];
        const subPaths = splitPathByM(d);
        
        // 4-5 is subPaths[4] (0-indexed). The user said "4-5".
        // Let's assume they meant the 5th piece based on my previous script output.
        if (subPaths.length >= 5) {
            const sub4_5 = subPaths[4];
            // Remove the 5th part from the original
            const remainingSubPaths = subPaths.filter((_, idx) => idx !== 4);
            const remainingD = remainingSubPaths.join(' ');
            
            // Replace original cell-4
            let newPaths = `<path id="cell-4" d="${remainingD}"${restAttrs}>`;
            // Add cell-6 for the separated 4-5
            newPaths += `\n    <path id="cell-6" d="${sub4_5}"${restAttrs}>`;
            
            content = content.replace(match[0], newPaths);
            fs.writeFileSync(filePath, content);
            console.log("Updated v3.svg: Separated 4-5 as cell-6");
        }
    }
}

// Process v4.svg
function applyV4() {
    const filePath = path.join(publicDir, 'v4.svg');
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Process cell-9 (split into 9-1 and 9-2)
    const regex9 = /<path[^>]+id="cell-9"[^>]*d="([^"]+)"([^>]*)>/;
    const match9 = regex9.exec(content);
    if (match9) {
        const subPaths = splitPathByM(match9[1]);
        if (subPaths.length >= 2) {
            const d1 = subPaths[0]; // Becomes cell-9
            const d2 = subPaths.slice(1).join(' '); // Becomes cell-6 (since v4 doesn't use 6)
            
            let newPaths = `<path id="cell-9" d="${d1}"${match9[2]}>`;
            newPaths += `\n    <path id="cell-6" d="${d2}"${match9[2]}>`;
            content = content.replace(match9[0], newPaths);
            console.log("Updated v4.svg: Separated cell-9 into cell-9 and cell-6");
        }
    }

    // 2. Process cell-4 (separate rightmost)
    const regex4 = /<path[^>]+id="cell-4"[^>]*d="([^"]+)"([^>]*)>/;
    const match4 = regex4.exec(content);
    if (match4) {
        const subPaths = splitPathByM(match4[1]);
        const rightmostIdx = findRightmostSubpath(subPaths);
        
        if (rightmostIdx !== -1) {
            const rightmostD = subPaths[rightmostIdx];
            const remainingD = subPaths.filter((_, idx) => idx !== rightmostIdx).join(' ');
            
            let newPaths = `<path id="cell-4" d="${remainingD}"${match4[2]}>`;
            newPaths += `\n    <path id="cell-5" d="${rightmostD}"${match4[2]}>`; // v4 doesn't use 5
            
            content = content.replace(match4[0], newPaths);
            console.log("Updated v4.svg: Separated cell-4 rightmost as cell-5");
        }
    }

    fs.writeFileSync(filePath, content);
}

applyV3();
applyV4();
