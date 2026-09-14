// src/components/tree/treeLayout.js
import * as d3 from "d3";

export const getTextWidth = (text, fontSize, fontWeight, fontFamily) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return context.measureText(text).width;
};

const layoutConfig = {
  xSpacing: 180,
  ySpacing: 150,
  layerPad: 36,
  parentGapMin: 180,
  parentStagger: 16,
  childGapMin: 120,
  childBlockPad: 20,
  iters: 8,
  // A component fanning out to dozens of peers would otherwise lay out as one
  // enormous horizontal strip, so anything wider than this wraps onto stacked
  // rows inside its own layer. Upstream layers stay above the anchor and
  // downstream layers below it either way.
  maxRowWidth: 2200,
  bandGap: 104,
};

function buildAdjacency(nodes) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const parents = new Map();
  const children = new Map();

  nodes.forEach((n) => {
    n.upstream.forEach((up) => {
      if (!parents.has(n.id)) parents.set(n.id, new Set());
      parents.get(n.id).add(up.component);
      if (!children.has(up.component)) children.set(up.component, new Set());
      children.get(up.component).add(n.id);
    });
    n.downstream.forEach((down) => {
      if (!children.has(n.id)) children.set(n.id, new Set());
      children.get(n.id).add(down.component);
      if (!parents.has(down.component)) parents.set(down.component, new Set());
      parents.get(down.component).add(n.id);
    });
  });
  return { nodeMap, parents, children };
}

export const calculateHierarchyPositions = (nodes, anchorId = null) => {
  const cfg = layoutConfig;
  const {
    nodeMap,
    parents: parentMap,
    children: childMap,
  } = buildAdjacency(nodes);

  const positions = new Map();
  const depthMap = new Map();

  // depth assignment
  if (anchorId && nodeMap.has(anchorId)) {
    const q = [{ id: anchorId, d: 0 }];
    depthMap.set(anchorId, 0);
    while (q.length) {
      const { id, d } = q.shift();
      if (childMap.has(id)) {
        childMap.get(id).forEach((cid) => {
          if (!depthMap.has(cid)) {
            depthMap.set(cid, d + 1);
            q.push({ id: cid, d: d + 1 });
          }
        });
      }
      if (parentMap.has(id)) {
        parentMap.get(id).forEach((pid) => {
          if (!depthMap.has(pid)) {
            depthMap.set(pid, d - 1);
            q.push({ id: pid, d: d - 1 });
          }
        });
      }
    }
  } else {
    const roots = nodes.filter(
      (n) => !parentMap.has(n.id) || parentMap.get(n.id).size === 0
    );
    const seen = new Set();
    const q = roots.map((n) => ({ id: n.id, d: 0 }));
    while (q.length) {
      const { id, d } = q.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      depthMap.set(id, d);
      if (childMap.has(id))
        childMap.get(id).forEach((cid) => q.push({ id: cid, d: d + 1 }));
    }
  }

  const depths = Array.from(depthMap.values());
  const minDepth = depths.length ? Math.min(...depths) : 0;
  const maxDepth = depths.length ? Math.max(...depths) : 0;

  const groups = new Map();
  nodes.forEach((n) => {
    const d = depthMap.get(n.id) ?? 0;
    n.depth = d;
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d).push(n);
  });

  // packing helpers
  const packLayer = (depth) => {
    const layer = groups.get(depth) || [];
    const items = layer
      .map((n) => ({ n, p: positions.get(n.id) }))
      .filter((x) => x.p);
    if (!items.length) return;
    let cursor = -Infinity;
    items.sort((a, b) => a.p.x - b.p.x);
    items.forEach(({ n, p }) => {
      const half = (n.width || 160) / 2;
      const left = p.x - half;
      const minLeft = cursor + layoutConfig.layerPad;
      if (left < minLeft) {
        const shift = minLeft - left;
        p.x += shift;
        p.ox = p.x;
      }
      cursor = p.x + half;
    });
    const avg = d3.mean(items, (x) => x.p.x) || 0;
    items.forEach(({ p }) => {
      p.x -= avg;
      p.ox = p.x;
    });
  };

  const centerParentsOverChildren = (depth, alpha = 1) => {
    const layer = groups.get(depth) || [];
    layer.forEach((p) => {
      if (!childMap.has(p.id)) return;
      const kids = Array.from(childMap.get(p.id))
        .map((id) => positions.get(id))
        .filter(Boolean);
      if (!kids.length) return;
      const left = d3.min(kids, (k) => k.x);
      const right = d3.max(kids, (k) => k.x);
      const targetX = (left + right) / 2;
      const prev = positions.get(p.id) || { x: 0, y: 0 };
      const nx = prev.x * (1 - alpha) + targetX * alpha;
      const y = (depth - minDepth) * layoutConfig.ySpacing;
      positions.set(p.id, { x: nx, y, ox: nx, oy: y });
    });
  };

  const centerChildrenUnderParents = (depth, alpha = 1) => {
    const parents = groups.get(depth) || [];
    const childDepth = depth + 1;
    const proposed = new Map();
    const gap = Math.max(layoutConfig.childGapMin, 0);

    parents.forEach((p) => {
      const pp = positions.get(p.id);
      if (!pp || !childMap.has(p.id)) return;

      const kids = Array.from(childMap.get(p.id))
        .map((id) => nodeMap.get(id))
        .filter(Boolean)
        .filter((k) => (k.depth ?? 0) === childDepth);

      if (!kids.length) return;

      kids.sort((a, b) => {
        const pa = positions.get(a.id)?.x ?? 0;
        const pb = positions.get(b.id)?.x ?? 0;
        if (pa !== pb) return pa - pb;
        return String(a.id).localeCompare(String(b.id));
      });

      const centers = new Array(kids.length);
      let leftCursor = pp.x;
      let rightCursor = pp.x;

      if (kids.length % 2 === 1) {
        const midIdx = Math.floor(kids.length / 2);
        const midW = kids[midIdx].width || 160;
        centers[midIdx] = pp.x;
        leftCursor = pp.x - (midW / 2 + gap);
        rightCursor = pp.x + (midW / 2 + gap);
        let L = midIdx - 1;
        let R = midIdx + 1;
        while (L >= 0 || R < kids.length) {
          if (L >= 0) {
            const w = kids[L].width || 160;
            centers[L] = leftCursor - w / 2;
            leftCursor -= w + gap;
            L--;
          }
          if (R < kids.length) {
            const w = kids[R].width || 160;
            centers[R] = rightCursor + w / 2;
            rightCursor += w + gap;
            R++;
          }
        }
      } else {
        let L = kids.length / 2 - 1;
        let R = kids.length / 2;
        leftCursor = pp.x - gap / 2;
        rightCursor = pp.x + gap / 2;
        while (L >= 0 || R < kids.length) {
          if (L >= 0) {
            const w = kids[L].width || 160;
            centers[L] = leftCursor - w / 2;
            leftCursor -= w + gap;
            L--;
          }
          if (R < kids.length) {
            const w = kids[R].width || 160;
            centers[R] = rightCursor + w / 2;
            rightCursor += w + gap;
            R++;
          }
        }
      }

      kids.forEach((k, i) => {
        if (!proposed.has(k.id)) proposed.set(k.id, []);
        proposed.get(k.id).push(centers[i]);
      });
    });

    proposed.forEach((xs, childId) => {
      let targetX;
      const prev = positions.get(childId) || { x: 0, y: 0 };
      if (xs.length === 1) {
        targetX = xs[0];
      } else {
        targetX = xs
          .slice()
          .sort((a, b) => Math.abs(a - prev.x) - Math.abs(b - prev.x))[0];
      }
      const nx = prev.x * (1 - alpha) + targetX * alpha;
      const y = (childDepth - minDepth) * layoutConfig.ySpacing;
      positions.set(childId, { x: nx, y, ox: nx, oy: y });
    });
  };

  // initial coarse placement
  for (
    let d = Math.min(...[...groups.keys(), 0]);
    d <= Math.max(...[...groups.keys(), 0]);
    d++
  ) {
    const layer = groups.get(d) || [];
    layer.forEach((n, i) => {
      if (!positions.has(n.id)) {
        const x = i * layoutConfig.xSpacing;
        const y = (d - minDepth) * layoutConfig.ySpacing;
        positions.set(n.id, { x, y, ox: x, oy: y });
      }
    });
    packLayer(d);
  }

  // pin anchor on x=0
  if (anchorId && positions.has(anchorId)) {
    const y = (depthMap.get(anchorId) - minDepth) * layoutConfig.ySpacing;
    positions.set(anchorId, { x: 0, y, ox: 0, oy: y });
  }

  // refinement: symmetric children under parents, then parents over children
  for (let k = 0; k < layoutConfig.iters; k++) {
    for (let d = minDepth; d < maxDepth; d++) {
      centerChildrenUnderParents(d, 0.9);
    }
    for (let d = maxDepth; d >= minDepth; d--) {
      centerParentsOverChildren(d, 0.9);
      packLayer(d);
    }
  }

  // Wrap over-wide layers onto stacked rows ("bands") inside their own layer,
  // then re-flow each band centred on x=0.
  const bandCount = new Map();
  groups.forEach((layer, depth) => {
    const gap = cfg.childGapMin;
    const totalWidth = layer.reduce((sum, n) => sum + (n.width || 160) + gap, 0);
    const bands = Math.max(1, Math.ceil(totalWidth / cfg.maxRowWidth));
    bandCount.set(depth, bands);

    if (bands === 1) {
      layer.forEach((n) => {
        n.band = 0;
      });
      return;
    }

    // Keep the order the refinement pass settled on, so siblings stay adjacent.
    const ordered = layer
      .slice()
      .sort((a, b) => (positions.get(a.id)?.x ?? 0) - (positions.get(b.id)?.x ?? 0));
    const perBand = Math.ceil(ordered.length / bands);
    ordered.forEach((n, i) => {
      n.band = Math.floor(i / perBand);
    });

    for (let b = 0; b < bands; b++) {
      const row = ordered.filter((n) => n.band === b);
      if (!row.length) continue;
      const rowWidth =
        row.reduce((sum, n) => sum + (n.width || 160), 0) + gap * (row.length - 1);
      let cursor = -rowWidth / 2;
      row.forEach((n) => {
        const w = n.width || 160;
        const x = cursor + w / 2;
        cursor += w + gap;
        const prev = positions.get(n.id) || {};
        positions.set(n.id, { ...prev, x, ox: x });
      });
    }
  });

  // Layers are no longer uniform height, so y is accumulated depth by depth.
  const depthTop = new Map();
  let cursorY = 0;
  [...groups.keys()]
    .sort((a, b) => a - b)
    .forEach((d) => {
      depthTop.set(d, cursorY);
      cursorY += (bandCount.get(d) - 1) * cfg.bandGap + cfg.ySpacing;
    });

  groups.forEach((layer, depth) => {
    layer.forEach((n) => {
      const p = positions.get(n.id);
      if (!p) return;
      const y = depthTop.get(depth) + (n.band || 0) * cfg.bandGap;
      p.y = y;
      p.oy = y;
    });
  });

  return { positions, minDepth };
};
