function polarToXY(x0, y0, length, theta) {
    return { x: x0 + length * Math.cos(theta), y: y0 + length * Math.sin(theta) };
}

export function buildTree(params, treeZoom, nodeOffsets) {
    const down = Math.PI / 2;

    const root = {
        id: 'root',
        x: params.rootX + params.horizontalShift + nodeOffsets.root.x,
        y: params.rootY + params.verticalShift + nodeOffsets.root.y,
        children: [],
    };

    const halfRoot = params.baseHalfSpreadRoot * params.rootAngleScale;
    const internalPos = polarToXY(root.x, root.y, params.L_root_to_internal * treeZoom, down + halfRoot);
    const tip3Pos = polarToXY(root.x, root.y, params.L_root_to_tip3 * treeZoom, down - halfRoot);

    const internalBase = { x: internalPos.x, y: internalPos.y };
    const internal = {
        id: 'internal',
        x: internalBase.x + nodeOffsets.internal.x,
        y: internalBase.y + nodeOffsets.internal.y,
        children: [],
    };

    const tip3 = {
        id: 'tip3',
        label: 'Tip 3',
        x: tip3Pos.x + nodeOffsets.tip3.x,
        y: tip3Pos.y + nodeOffsets.tip3.y,
        children: [],
    };

    const halfInternal = params.baseHalfSpreadInternal * params.internalAngleScale;
    const tip1Pos = polarToXY(internalBase.x, internalBase.y, params.L_internal_to_tips * treeZoom, down + halfInternal);
    const tip2Pos = polarToXY(internalBase.x, internalBase.y, params.L_internal_to_tips * treeZoom, down - halfInternal);

    const tip1 = {
        id: 'tip1',
        label: 'Tip 1',
        x: tip1Pos.x + nodeOffsets.tip1.x,
        y: tip1Pos.y + nodeOffsets.tip1.y,
        children: [],
    };
    const tip2 = {
        id: 'tip2',
        label: 'Tip 2',
        x: tip2Pos.x + nodeOffsets.tip2.x,
        y: tip2Pos.y + nodeOffsets.tip2.y,
        children: [],
    };

    internal.children.push(tip1, tip2);
    root.children.push(internal, tip3);
    return root;
}

export function buildTreeMulti(params, nTips, treeZoom, nodeOffsets, canvasSize) {
    const rootX = params.rootX + 30 + params.horizontalShift + nodeOffsets.root.x;
    const rootY = params.rootY + params.verticalShift + nodeOffsets.root.y;

    const xStep = Math.max(18, 0.55 * params.L_internal_to_tips * treeZoom);
    const yStep = Math.max(26, 0.85 * params.L_internal_to_tips * treeZoom);
    const xs = Array.from({ length: nTips }, (_, i) => rootX + (i - (nTips - 1) / 2) * xStep);

    function buildSpan(i0, i1, depth) {
        if (i0 === i1) {
            return {
                id: `tip${i0 + 1}`,
                x: xs[i0],
                y: rootY + depth * yStep,
                children: [],
                label: nTips > 25 ? `${i0 + 1}` : `Tip ${i0 + 1}`,
            };
        }

        const mid = Math.floor((i0 + i1) / 2);
        const left = buildSpan(i0, mid, depth + 1);
        const right = buildSpan(mid + 1, i1, depth + 1);
        return {
            id: `internal_${i0}_${i1}`,
            x: (left.x + right.x) / 2,
            y: rootY + depth * yStep,
            children: [left, right],
        };
    }

    const treeNode = buildSpan(0, nTips - 1, 0);
    treeNode.id = 'root';
    treeNode.x = rootX;
    treeNode.y = rootY;

    const marginTop = 60;
    const marginBottom = 140;
    const marginLeft = 80;
    const marginRight = 60;
    const maxW = canvasSize.width - (marginLeft + marginRight);
    const maxH = canvasSize.height - (marginTop + marginBottom);
    const bounds = getTreeBounds(treeNode);
    const treeW = bounds.maxX - bounds.minX;
    const treeH = bounds.maxY - bounds.minY;
    const scaleX = treeW > maxW ? maxW / treeW : 1;
    const scaleY = treeH > maxH ? maxH / treeH : 1;

    function scaleTreeXY(node, sx, sy, ox, oy) {
        node.x = ox + sx * (node.x - ox);
        node.y = oy + sy * (node.y - oy);
        node.children.forEach(child => scaleTreeXY(child, sx, sy, ox, oy));
    }

    scaleTreeXY(treeNode, scaleX, scaleY, rootX, rootY);
    return treeNode;
}

export function findNodeById(node, id) {
    if (!node || id == null) return null;
    if (node.id === id) return node;

    for (const child of node.children || []) {
        const found = findNodeById(child, id);
        if (found) return found;
    }

    return null;
}

export function getTreeBounds(node) {
    let minX = node.x;
    let maxX = node.x;
    let minY = node.y;
    let maxY = node.y;

    function traverse(current) {
        minX = Math.min(minX, current.x);
        maxX = Math.max(maxX, current.x);
        minY = Math.min(minY, current.y);
        maxY = Math.max(maxY, current.y);
        (current.children || []).forEach(traverse);
    }

    traverse(node);
    return { minX, maxX, minY, maxY };
}
