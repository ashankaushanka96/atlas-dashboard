// src/components/ComponentMap/ComponentMap.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  useTheme,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  Paper,
  Stack,
  Autocomplete,
  TextField,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import KeyboardDoubleArrowUpIcon from "@mui/icons-material/KeyboardDoubleArrowUp";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import HubIcon from "@mui/icons-material/Hub";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import AdjustIcon from "@mui/icons-material/Adjust";
import SearchIcon from "@mui/icons-material/Search";
import * as d3 from "d3";
import { API } from "../../services/auth";
import { useSearchParams } from "react-router-dom"; // NEW
import ErrorModal from "../../modals/ErrorModal";
import StatusChip from "../HostDetails/StatusChip";
import hexToRgb from "../shared/hexToRgb";

import TreeHeader from "./TreeHeader";
import ServerScanLoader from "./ServerScanLoader";
import { calculateHierarchyPositions, getTextWidth } from "./treeLayout";

const SEARCH_ACCENT = "#60A5FA";

const pillFieldSx = (color) => {
  const rgb = hexToRgb(color);
  return {
    "& .MuiOutlinedInput-root": {
      borderRadius: 999,
      "& fieldset": { borderColor: "rgba(148, 163, 184, 0.32)" },
      "&:hover fieldset": { borderColor: `rgba(${rgb}, 0.6)` },
      "&.Mui-focused fieldset": { borderColor: color },
    },
  };
};

const pillAutocompletePaperProps = (color) => {
  const rgb = hexToRgb(color);
  return {
    sx: {
      mt: 1,
      borderRadius: "12px",
      border: "1px solid rgba(148, 163, 184, 0.16)",
      "& .MuiAutocomplete-listbox": { py: 0.5 },
      "& .MuiAutocomplete-option": {
        borderRadius: "8px",
        mx: 0.75,
        my: 0.15,
        minHeight: 32,
        py: 0.25,
        fontSize: 13,
      },
      "& .MuiAutocomplete-option.Mui-focused": {
        bgcolor: `rgba(${rgb}, 0.12)`,
      },
      "& .MuiAutocomplete-option[aria-selected='true']": {
        bgcolor: `rgba(${rgb}, 0.16)`,
        color,
        fontWeight: 600,
      },
      "& .MuiAutocomplete-option[aria-selected='true'].Mui-focused": {
        bgcolor: `rgba(${rgb}, 0.24)`,
      },
    },
  };
};

const VALID_TYPES = new Set([
  "upstream",
  "downstream",
  "all",
  "immediate-upstream",
  "immediate-downstream",
  "immediate-all",
]); // NEW
const EMPTY_FILTER = { nodes: [], links: [] };
const NAME_FONT_SIZE = 13;
const IP_FONT_SIZE = 11;

const ComponentMap = () => {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openErrorModal, setOpenErrorModal] = useState(false);

  const [selectedComponentId, setSelectedComponentId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [filteredLinks, setFilteredLinks] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [connectionType, setConnectionType] = useState(null);
  const [expandedUpstreamIds, setExpandedUpstreamIds] = useState(new Set());
  const [expandedDownstreamIds, setExpandedDownstreamIds] = useState(new Set());
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [searchParams, setSearchParams] = useSearchParams(); // NEW

  const svgRef = useRef();
  const containerRef = useRef();
  const zoomContainerRef = useRef();
  const zoomBehavior = useRef();
  const theme = useTheme();
  const animationFrameRef = useRef();
  const selectedComponentRef = useRef({
    id: null,
    type: null,
    ids: [],
    expandedUpstreamIds: [],
    expandedDownstreamIds: [],
  });
  const simulationRef = useRef();
  const hierarchyPositions = useRef({ positions: new Map(), minDepth: 0 });
  const autoFitNext = useRef(false);
  // Set when an expand chevron is clicked: keeps that node under the cursor
  // instead of refitting the whole graph, so you don't lose your place.
  const preserveNodeRef = useRef(null);
  const previousNodeIdsRef = useRef(new Set());
  const wrapperRef = useRef(null);

  // --- helpers (URL) ------------------------------------------------------- // NEW
  const syncUrl = (id, type) => {
    setSearchParams((sp) => {
      if (id && type && VALID_TYPES.has(type)) {
        sp.set("componentid", id);
        sp.set("connectiontype", type);
      } else {
        sp.delete("componentid");
        sp.delete("connectiontype");
      }
      return sp;
    });
  };

  const readUrl = () => {
    const id = searchParams.get("componentid") || null;
    const type = searchParams.get("connectiontype") || null;
    return {
      id,
      type: VALID_TYPES.has(type) ? type : null,
    };
  };
  // ------------------------------------------------------------------------ //

  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  const resetExpandedBranches = () => {
    setExpandedUpstreamIds((prev) => (prev.size ? new Set() : prev));
    setExpandedDownstreamIds((prev) => (prev.size ? new Set() : prev));
  };

  const buildImmediateExpansionGraph = (
    rootId,
    expandedUps,
    expandedDowns,
    nodesArray = nodes,
    linksArray = links
  ) => {
    const nodeMap = new Map(nodesArray.map((node) => [node.id, node]));
    const rootNode = nodeMap.get(rootId);
    if (!rootNode) return EMPTY_FILTER;

    const visibleIds = new Set([rootId]);
    const queue = [rootId];
    const processed = new Set();

    while (queue.length) {
      const currentId = queue.shift();
      if (processed.has(currentId)) continue;
      processed.add(currentId);

      const currentNode = nodeMap.get(currentId);
      if (!currentNode) continue;

      const expandUp = currentId === rootId || expandedUps.has(currentId);
      const expandDown = currentId === rootId || expandedDowns.has(currentId);

      if (expandUp) {
        currentNode.upstream.forEach((edge) => {
          if (!visibleIds.has(edge.component)) {
            visibleIds.add(edge.component);
            queue.push(edge.component);
          } else if (expandedUps.has(edge.component) || expandedDowns.has(edge.component)) {
            queue.push(edge.component);
          }
        });
      }

      if (expandDown) {
        currentNode.downstream.forEach((edge) => {
          if (!visibleIds.has(edge.component)) {
            visibleIds.add(edge.component);
            queue.push(edge.component);
          } else if (expandedUps.has(edge.component) || expandedDowns.has(edge.component)) {
            queue.push(edge.component);
          }
        });
      }
    }

    const filteredNodesForExpansion = nodesArray.filter((node) =>
      visibleIds.has(node.id)
    );
    const getId = (value) => (typeof value === "string" ? value : value?.id);
    const filteredLinksForExpansion = linksArray.filter((link) => {
      const sourceId = getId(link.source);
      const targetId = getId(link.target);
      if (!visibleIds.has(sourceId) || !visibleIds.has(targetId)) return false;

      if (link.type === "upstream") {
        return targetId === rootId || expandedUps.has(targetId);
      }
      if (link.type === "downstream") {
        return sourceId === rootId || expandedDowns.has(sourceId);
      }
      return false;
    });

    return {
      nodes: filteredNodesForExpansion,
      links: filteredLinksForExpansion,
    };
  };

  const handleSelectComponent = (id) => {
    setSelectedIds(id ? new Set([id]) : new Set());
    setSelectedComponentId(id);
    setConnectionType(id ? "immediate-all" : null);
    resetExpandedBranches();
    if (!id) {
      hierarchyPositions.current = { positions: new Map(), minDepth: 0 };
      setFilteredNodes(EMPTY_FILTER.nodes);
      setFilteredLinks(EMPTY_FILTER.links);
      setHighlightedNode(null);
      syncUrl(null, null);
    } else {
      syncUrl(id, "immediate-all");
    }
  };

  const fitToPositions = (positionsMap, nodesArr) => {
    if (!containerRef.current) return;
    const pad = 40;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    nodesArr.forEach((n) => {
      const p = positionsMap.get(n.id);
      if (!p) return;
      const halfW = (n.width || 160) / 2;
      const halfH = (n.height || 60) / 2;
      minX = Math.min(minX, p.x - halfW);
      maxX = Math.max(maxX, p.x + halfW);
      minY = Math.min(minY, p.y - halfH);
      maxY = Math.max(maxY, p.y + halfH);
    });

    if (!isFinite(minX)) return;

    const bounds = {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + 2 * pad,
      height: maxY - minY + 2 * pad,
    };

    const parentWidth = containerRef.current.clientWidth;
    const parentHeight = containerRef.current.clientHeight - 50;
    const scale = Math.min(
      1.1,
      0.9 / Math.max(bounds.width / parentWidth, bounds.height / parentHeight)
    );
    const midX = bounds.x + bounds.width / 2;
    const midY = bounds.y + bounds.height / 2;
    const translateX = parentWidth / 2 - scale * midX;
    const translateY = parentHeight / 2 - scale * midY;

    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(
        zoomBehavior.current.transform,
        d3.zoomIdentity.translate(translateX, translateY).scale(scale)
      );
  };

  // Remember where a node currently sits on screen, before a re-layout.
  const rememberNodeScreenPosition = (node) => {
    if (!svgRef.current || node?.x == null || node?.y == null) return;
    const [screenX, screenY] = d3
      .zoomTransform(svgRef.current)
      .apply([node.x, node.y]);
    preserveNodeRef.current = { id: node.id, screenX, screenY };
  };

  // Pan (never rescale) so the remembered node lands back on the same pixel.
  // Returns false if there's nothing to preserve, so the caller can fall back
  // to fitting the whole graph.
  const keepNodeStationary = (positionsMap) => {
    const target = preserveNodeRef.current;
    preserveNodeRef.current = null;
    if (!target || !svgRef.current || !zoomBehavior.current) return false;

    const position = positionsMap.get(target.id);
    if (!position) return false;

    const current = d3.zoomTransform(svgRef.current);
    const translateX = target.screenX - current.k * position.x;
    const translateY = target.screenY - current.k * position.y;

    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(
        zoomBehavior.current.transform,
        d3.zoomIdentity.translate(translateX, translateY).scale(current.k)
      );
    return true;
  };

  const fetchData = async (fresh = false) => {
    try {
      setError(null);
      const response = await API.get("/component-tree/map", { params: fresh ? { fresh: true } : undefined });
      const comps = response.data.components;

      // Watched components are keyed "ip:component"; unmonitored peers are
      // keyed "ip-port" and carry that whole string as their name.
      const nodesArray = Object.entries(comps).map(([id, node]) => ({
        id,
        name: node.kind === "unknown" ? id : id.split(":")[1]?.toLowerCase() || id,
        ip: node.kind === "unknown" ? "unmonitored" : id.split(":")[0] || "",
        ...node,
      }));

      const linksArray = [];
      nodesArray.forEach((source) => {
        source.downstream.forEach((e) => {
          linksArray.push({
            source: source.id,
            target: e.component,
            type: "downstream",
            sourcePort: e.local_port,
            targetPort: e.remote_port,
          });
        });
        source.upstream.forEach((e) => {
          linksArray.push({
            source: e.component,
            target: source.id,
            type: "upstream",
            sourcePort: e.remote_port,
            targetPort: e.local_port,
          });
        });
      });

      setNodes(nodesArray);
      setLinks(linksArray);

      // Try to restore from URL first ------------------------------------- // NEW
      const { id: urlId, type: urlType } = readUrl();
      if (urlId && urlType) {
        // if the id exists in data, apply it
        const exists = nodesArray.some((n) => n.id === urlId);
        if (exists) {
          setSelectedIds(new Set([urlId]));
          setSelectedComponentId(urlId);
          setConnectionType(urlType);
          resetExpandedBranches();
          filterConnectedComponents(urlId, urlType, nodesArray, linksArray, {
            expandedUps: new Set(),
            expandedDowns: new Set(),
          });
          return;
        }
      }
      // -------------------------------------------------------------------- //

      // restore selection if present (pre-existing behavior)
      if (
        selectedComponentRef.current.ids?.length > 1 &&
        selectedComponentRef.current.type
      ) {
        const set = new Set(selectedComponentRef.current.ids);
        setSelectedIds(set);
        setConnectionType(selectedComponentRef.current.type);
        resetExpandedBranches();
        filterConnectedForSet(
          set,
          selectedComponentRef.current.type,
          nodesArray,
          linksArray
        );
      } else if (
        selectedComponentRef.current.id &&
        selectedComponentRef.current.type
      ) {
        setSelectedComponentId(selectedComponentRef.current.id);
        setConnectionType(selectedComponentRef.current.type);
        const restoredExpandedUps = new Set(
          selectedComponentRef.current.expandedUpstreamIds || []
        );
        const restoredExpandedDowns = new Set(
          selectedComponentRef.current.expandedDownstreamIds || []
        );
        setExpandedUpstreamIds(restoredExpandedUps);
        setExpandedDownstreamIds(restoredExpandedDowns);
        filterConnectedComponents(
          selectedComponentRef.current.id,
          selectedComponentRef.current.type,
          nodesArray,
          linksArray,
          {
            expandedUps: restoredExpandedUps,
            expandedDowns: restoredExpandedDowns,
          }
        );
      } else {
        hierarchyPositions.current = { positions: new Map(), minDepth: 0 };
        setFilteredNodes(EMPTY_FILTER.nodes);
        setFilteredLinks(EMPTY_FILTER.links);
      }
    } catch (err) {
      setError(err.message || "Failed to load component map");
      setOpenErrorModal(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    selectedComponentRef.current = {
      id: selectedComponentId,
      type: connectionType,
      ids: Array.from(selectedIds),
      expandedUpstreamIds: Array.from(expandedUpstreamIds),
      expandedDownstreamIds: Array.from(expandedDownstreamIds),
    };
    fetchData(true);
  };

  const handleCloseContextMenu = () => setContextMenu(null);

  // ---- Helpers for filtering ----
  const collectConnected = (startId, type, nodesArray, linksArray) => {
    const node = nodesArray.find((n) => n.id === startId);
    if (!node) return new Set([startId]);
    const acc = new Set([startId]);

    if (type === "immediate-downstream") {
      node.downstream.forEach((e) => acc.add(e.component));
      return acc;
    }

    if (type === "immediate-upstream") {
      node.upstream.forEach((e) => acc.add(e.component));
      return acc;
    }

    if (type === "immediate-all") {
      node.upstream.forEach((e) => acc.add(e.component));
      node.downstream.forEach((e) => acc.add(e.component));
      return acc;
    }

    const pushAll = (arr, q) => arr.forEach((e) => q.push(e.component));
    const expand = (q, dir) => {
      while (q.length) {
        const cur = q.shift();
        if (acc.has(cur)) continue;
        acc.add(cur);
        const cn = nodesArray.find((n) => n.id === cur);
        if (!cn) continue;
        if (dir !== "upstream") pushAll(cn.downstream, q);
        if (dir !== "downstream") pushAll(cn.upstream, q);
      }
    };
    if (type === "downstream")
      expand([...node.downstream.map((e) => e.component)], "downstream");
    else if (type === "upstream")
      expand([...node.upstream.map((e) => e.component)], "upstream");
    else {
      expand([...node.downstream.map((e) => e.component)], "downstream");
      expand([...node.upstream.map((e) => e.component)], "upstream");
    }
    return acc;
  };

  const filterConnectedForSet = (
    idsSet,
    type,
    nodesArray = nodes,
    linksArray = links
  ) => {
    autoFitNext.current = true;
    if (!idsSet || idsSet.size === 0) {
      resetExpandedBranches();
      setFilteredNodes(EMPTY_FILTER.nodes);
      setFilteredLinks(EMPTY_FILTER.links);
      setHighlightedNode(null);
      hierarchyPositions.current = { positions: new Map(), minDepth: 0 };
      syncUrl(null, null); // NEW
      return;
    }

    resetExpandedBranches();

    const union = new Set();
    [...idsSet].forEach((id) => {
      const s = collectConnected(id, type, nodesArray, linksArray);
      s.forEach((x) => union.add(x));
    });
    const getId = (v) => (typeof v === "string" ? v : v?.id);

    setFilteredNodes(nodesArray.filter((n) => union.has(n.id)));
    setFilteredLinks(
      linksArray.filter((l) => {
        const sId = getId(l.source);
        const tId = getId(l.target);
        if (!union.has(sId) || !union.has(tId)) return false;
        if (type === "downstream") return l.type === "downstream";
        if (type === "upstream") return l.type === "upstream";
        if (type === "immediate-downstream") return l.type === "downstream";
        if (type === "immediate-upstream") return l.type === "upstream";
        if (type === "immediate-all") {
          return l.type === "downstream" || l.type === "upstream";
        }
        return true;
      })
    );
    setHighlightedNode(null);
    hierarchyPositions.current = { positions: new Map(), minDepth: 0 };

    // write first selected id + type to URL for shareability ------------- // NEW
    const firstId = [...idsSet][0] || null;
    syncUrl(firstId, type || null);
    // -------------------------------------------------------------------- //
  };

  const filterConnectedComponents = (
    nodeId,
    type,
    nodesArray = nodes,
    linksArray = links,
    branchState = {
      expandedUps: expandedUpstreamIds,
      expandedDowns: expandedDownstreamIds,
    }
  ) => {
    autoFitNext.current = true;
    const node = nodesArray.find((n) => n.id === nodeId);
    if (!node) return;

    setConnectionType(type);
    setSelectedComponentId(nodeId);

    if (type === "immediate-all") {
      const expandedGraph = buildImmediateExpansionGraph(
        nodeId,
        branchState.expandedUps,
        branchState.expandedDowns,
        nodesArray,
        linksArray
      );
      setFilteredNodes(expandedGraph.nodes);
      setFilteredLinks(expandedGraph.links);
      setHighlightedNode(nodeId);
      hierarchyPositions.current = { positions: new Map(), minDepth: 0 };
      syncUrl(nodeId, type || null);
      return;
    }

    resetExpandedBranches();

    const nodeSet = new Set([nodeId]);
    const addAll = (arr, q) => arr.forEach((e) => q.push(e.component));

    if (type === "immediate-downstream") {
      node.downstream.forEach((e) => nodeSet.add(e.component));
    } else if (type === "immediate-upstream") {
      node.upstream.forEach((e) => nodeSet.add(e.component));
    } else if (type === "immediate-all") {
      node.upstream.forEach((e) => nodeSet.add(e.component));
      node.downstream.forEach((e) => nodeSet.add(e.component));
    } else if (type === "downstream") {
      const q = [...node.downstream.map((e) => e.component)];
      while (q.length) {
        const cur = q.shift();
        if (!nodeSet.has(cur)) {
          nodeSet.add(cur);
          const cn = nodesArray.find((n) => n.id === cur);
          if (cn) addAll(cn.downstream, q);
        }
      }
    } else if (type === "upstream") {
      const q = [...node.upstream.map((e) => e.component)];
      while (q.length) {
        const cur = q.shift();
        if (!nodeSet.has(cur)) {
          nodeSet.add(cur);
          const cn = nodesArray.find((n) => n.id === cur);
          if (cn) addAll(cn.upstream, q);
        }
      }
    } else {
      const dq = [...node.downstream.map((e) => e.component)];
      const uq = [...node.upstream.map((e) => e.component)];
      while (dq.length) {
        const cur = dq.shift();
        if (!nodeSet.has(cur)) {
          nodeSet.add(cur);
          const cn = nodesArray.find((n) => n.id === cur);
          if (cn) addAll(cn.downstream, dq);
        }
      }
      while (uq.length) {
        const cur = uq.shift();
        if (!nodeSet.has(cur)) {
          nodeSet.add(cur);
          const cn = nodesArray.find((n) => n.id === cur);
          if (cn) addAll(cn.upstream, uq);
        }
      }
    }

    const getId = (v) => (typeof v === "string" ? v : v?.id);
    const newFilteredNodes = nodesArray.filter((n) => nodeSet.has(n.id));
    const newFilteredLinks = linksArray.filter((l) => {
      const sId = getId(l.source);
      const tId = getId(l.target);
      if (!nodeSet.has(sId) || !nodeSet.has(tId)) return false;
      if (type === "downstream") return l.type === "downstream";
      if (type === "upstream") return l.type === "upstream";
      if (type === "immediate-downstream") return l.type === "downstream";
      if (type === "immediate-upstream") return l.type === "upstream";
      if (type === "immediate-all") {
        return l.type === "downstream" || l.type === "upstream";
      }
      return true;
    });

    setFilteredNodes(newFilteredNodes);
    setFilteredLinks(newFilteredLinks);
    setHighlightedNode(nodeId);

    hierarchyPositions.current = { positions: new Map(), minDepth: 0 };

    // write to URL -------------------------------------------------------- // NEW
    syncUrl(nodeId, type || null);
    // -------------------------------------------------------------------- //
  };

  const resetToHierarchyLayout = () => {
    if (!simulationRef.current || filteredNodes.length === 0) return;
    const singleAnchor =
      selectedIds.size === 1
        ? Array.from(selectedIds)[0]
        : selectedComponentId || null;
    const { positions } = calculateHierarchyPositions(
      filteredNodes,
      singleAnchor
    );

    hierarchyPositions.current = { positions: new Map(positions), minDepth: 0 };
    filteredNodes.forEach((node) => {
      const pos = positions.get(node.id);
      if (pos) {
        node.x = pos.x;
        node.y = pos.y;
        node.fx = pos.x;
        node.fy = pos.y;
      }
    });
    simulationRef.current.alpha(1).restart();
    fitToPositions(positions, filteredNodes);
  };

  const resetView = () => {
    const svg = d3.select(svgRef.current);
    const container = d3.select(zoomContainerRef.current);
    if (filteredNodes.length > 0) {
      const bounds = container.node().getBBox();
      const parentWidth = containerRef.current.clientWidth;
      const parentHeight = containerRef.current.clientHeight - 50;
      const width = bounds.width || 1;
      const height = bounds.height || 1;
      const midX = bounds.x + width / 2;
      const midY = bounds.y + height / 2;
      const scale = 0.9 / Math.max(width / parentWidth, height / parentHeight);
      const translateX = parentWidth / 2 - scale * midX;
      const translateY = parentHeight / 2 - scale * midY;
      svg
        .transition()
        .duration(750)
        .call(
          zoomBehavior.current.transform,
          d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );
    } else {
      svg
        .transition()
        .duration(750)
        .call(zoomBehavior.current.transform, d3.zoomIdentity);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to URL changes (e.g., user edits address bar or navigates back) --- // NEW
  useEffect(() => {
    if (loading) return;
    const { id, type } = readUrl();
    // If URL cleared, reset selection
    if (!id || !type) {
      if (selectedComponentId || connectionType) {
        setSelectedIds(new Set());
        setSelectedComponentId(null);
        setConnectionType(null);
        resetExpandedBranches();
        setFilteredNodes(EMPTY_FILTER.nodes);
        setFilteredLinks(EMPTY_FILTER.links);
        setHighlightedNode(null);
      }
      return;
    }
    // If URL differs from current state, apply it
    if (id !== selectedComponentId || type !== connectionType) {
      const exists = nodes.some((n) => n.id === id);
      if (exists) {
        setSelectedIds(new Set([id]));
        resetExpandedBranches();
        filterConnectedComponents(id, type, nodes, links, {
          expandedUps: new Set(),
          expandedDowns: new Set(),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // watch query string
  // ------------------------------------------------------------------------- //

  // re-filter if selection toggles (existing behavior)
  useEffect(() => {
    if (selectedComponentId && connectionType) {
      filterConnectedComponents(selectedComponentId, connectionType);
    } else if (!selectedComponentId) {
      hierarchyPositions.current = { positions: new Map(), minDepth: 0 };
      resetExpandedBranches();
      setFilteredNodes(EMPTY_FILTER.nodes);
      setFilteredLinks(EMPTY_FILTER.links);
      setHighlightedNode(null);
      syncUrl(null, null); // NEW
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedComponentId,
    nodes,
    links,
    connectionType,
    expandedUpstreamIds,
    expandedDownstreamIds,
  ]);

  // mount/update D3 (unchanged below except where noted)
  useEffect(() => {
    if (filteredNodes.length === 0) return;

    // measure nodes for rect sizes (font sizes here must match the <text> below,
    // otherwise the label overflows the box it was sized for)
    filteredNodes.forEach((node) => {
      const nameWidth = getTextWidth(
        node.name,
        NAME_FONT_SIZE,
        "bold",
        theme.typography.fontFamily
      );
      const ipWidth = getTextWidth(
        node.ip,
        IP_FONT_SIZE,
        "normal",
        theme.typography.fontFamily
      );
      node.width = Math.max(nameWidth, ipWidth) + 44;
      node.height = 60;
    });

    const svg = d3.select(svgRef.current);
    const container = d3.select(zoomContainerRef.current);
    container.selectAll("*").remove();

    // Only flag arrivals for an expand -- on a fresh selection everything is
    // new, and flashing the whole graph would be noise.
    const isExpanding = Boolean(preserveNodeRef.current);
    const previousNodeIds = previousNodeIdsRef.current;
    previousNodeIdsRef.current = new Set(filteredNodes.map((n) => n.id));
    const isNewNode = (d) => isExpanding && !previousNodeIds.has(d.id);

    const singleAnchor =
      selectedIds.size === 1
        ? Array.from(selectedIds)[0]
        : selectedComponentId || null;

    const { positions, minDepth } = calculateHierarchyPositions(
      filteredNodes,
      singleAnchor
    );
    hierarchyPositions.current = { positions, minDepth };

    filteredNodes.forEach((node) => {
      const pos = positions.get(node.id);
      if (pos) {
        node.x = pos.x;
        node.y = pos.y;
        node.fx = pos.x;
        node.fy = pos.y;
        node.ox = pos.ox;
        node.oy = pos.oy;
      }
    });

    // Themed to the app's tinted icon-chip palette instead of MUI's semantic
    // theme colors, so this graph reads consistently with every other section.
    const upstreamColor = "#60A5FA";
    const downstreamColor = "#34D399";
    const selectedColor = "#E24B4A";
    const neutralColor = "#475569";
    const linkColor = "#F59E0B";
    const glowColor = "#FCD34D";
    const depthShade = (level) => Math.min(0.42 + level * 0.12, 0.88);
    const unknownColor = "#475569";
    const isUnknown = (node) => node.kind === "unknown";
    const nodeFill = (node) => {
      const depth = node.depth || 0;
      const level = Math.abs(depth);
      const isActive = selectedIds.has(node.id) || node.id === highlightedNode;
      if (isActive) return selectedColor;
      if (isUnknown(node)) return unknownColor;
      if (depth < 0) return d3.interpolateRgb("#1E3A5F", upstreamColor)(depthShade(level));
      if (depth > 0) return d3.interpolateRgb("#14532D", downstreamColor)(depthShade(level));
      return singleAnchor
        ? neutralColor
        : d3.interpolateRgb("#3B2E5A", "#A78BFA")(depthShade(level + 1));
    };
    const nodeStroke = (node) => {
      if (selectedIds.has(node.id) || node.id === highlightedNode) {
        return glowColor;
      }
      if (isUnknown(node)) return "#94A3B8";
      const depth = node.depth || 0;
      if (depth < 0) return "#93C5FD";
      if (depth > 0) return "#6EE7B7";
      return "#E2E8F0";
    };
    const nodeStrokeWidth = (node) =>
      selectedIds.has(node.id) || node.id === highlightedNode ? 5 : 2.5;
    const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
    const showExpandControls =
      connectionType === "immediate-all" && Boolean(selectedComponentId);
    const canExpandUpstream = (node) =>
      showExpandControls &&
      node.id !== selectedComponentId &&
      node.upstream?.some((edge) => !visibleNodeIds.has(edge.component));
    const canExpandDownstream = (node) =>
      showExpandControls &&
      node.id !== selectedComponentId &&
      node.downstream?.some((edge) => !visibleNodeIds.has(edge.component));

    d3.select(svgRef.current).select("defs").remove();
    const defs = d3.select(svgRef.current).append("defs");
    defs
      .append("marker")
      .attr("id", "arrow-link")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", linkColor);
    const selectedGlow = defs
      .append("filter")
      .attr("id", "selected-node-glow")
      .attr("x", "-40%")
      .attr("y", "-40%")
      .attr("width", "180%")
      .attr("height", "180%");
    selectedGlow
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 0)
      .attr("stdDeviation", 5)
      .attr("flood-color", glowColor)
      .attr("flood-opacity", 0.85);

    const simulation = d3
      .forceSimulation(filteredNodes)
      .force(
        "link",
        d3
          .forceLink(filteredLinks)
          .id((d) => d.id)
          .distance((d) => {
            const sourceDepth = d.source.depth || 0;
            const targetDepth = d.target.depth || 0;
            return Math.abs(targetDepth - sourceDepth) > 0 ? 140 : 110;
          })
          .strength(0.08)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force(
        "collision",
        d3.forceCollide().radius((d) => Math.max(d.width, d.height) / 2 + 18)
      )
      .force(
        "x",
        d3
          .forceX()
          .x((d) => d.ox)
          .strength(1)
      )
      .force(
        "y",
        d3
          .forceY()
          .y((d) => d.oy)
          .strength(1.2)
      );

    simulationRef.current = simulation;

    if (autoFitNext.current) {
      filteredNodes.forEach((n) => {
        n.fx = n.ox ?? n.x;
        n.fy = n.oy ?? n.y;
      });
      simulation.alpha(1).restart();
    }

    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(filteredLinks)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", linkColor)
      .attr("stroke-width", 1.8)
      .attr("stroke-opacity", 0.7)
      .attr("marker-end", "url(#arrow-link)");

    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        setContextMenu({
          mouseX: event.clientX,
          mouseY: event.clientY,
          node: d,
        });
      })
      .on("click", (event, d) => {
        if (event.defaultPrevented) return;
        const multi = event.ctrlKey || event.metaKey;
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (multi) {
            next.has(d.id) ? next.delete(d.id) : next.add(d.id);
          } else {
            next.clear();
            next.add(d.id);
          }
          const arr = Array.from(next);
          // set selection + default connection type "immediate-all"
          const nextId = arr.length === 1 ? arr[0] : null;
          resetExpandedBranches();
          setSelectedComponentId(nextId);
          setConnectionType(nextId ? "immediate-all" : null);
          if (nextId) syncUrl(nextId, "immediate-all"); // NEW
          return next;
        });
      });

    node.append("title").text("Right-click for options");

    node
      .append("rect")
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("rx", 10)
      .attr("x", (d) => -d.width / 2)
      .attr("y", (d) => -d.height / 2)
      .attr("fill", (d) => nodeFill(d))
      .attr("stroke", (d) => nodeStroke(d))
      .attr("stroke-width", (d) => nodeStrokeWidth(d))
      .attr("stroke-dasharray", (d) => (isUnknown(d) ? "6 4" : null))
      .attr("filter", (d) =>
        selectedIds.has(d.id) || d.id === highlightedNode
          ? "url(#selected-node-glow)"
          : null
      );

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", theme.palette.common.white)
      .attr("font-size", NAME_FONT_SIZE)
      .attr("font-weight", "bold")
      .attr("dy", -9)
      .attr("pointer-events", "none")
      .text((d) => d.name);

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", theme.palette.common.white)
      .attr("font-size", IP_FONT_SIZE)
      .attr("fill-opacity", 0.85)
      .attr("dy", 11)
      .attr("pointer-events", "none")
      .text((d) => d.ip);

    // Newly revealed nodes fade in and hold a bright ring for a moment, so it's
    // obvious what the expand actually added.
    const arrivals = node.filter(isNewNode);
    arrivals.attr("opacity", 0).transition().duration(450).attr("opacity", 1);
    arrivals
      .select("rect")
      .attr("stroke", glowColor)
      .attr("stroke-width", 5)
      .transition()
      .delay(650)
      .duration(900)
      .attr("stroke", (d) => nodeStroke(d))
      .attr("stroke-width", (d) => nodeStrokeWidth(d));

    const expandUpstreamControl = node
      .filter((d) => canExpandUpstream(d))
      .append("g")
      .attr("class", "expand-upstream-control")
      .attr("transform", (d) => `translate(0,${-d.height / 2 - 18})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        autoFitNext.current = true;
        rememberNodeScreenPosition(d);
        setExpandedUpstreamIds((prev) => {
          if (prev.has(d.id)) return prev;
          const next = new Set(prev);
          next.add(d.id);
          return next;
        });
      });

    expandUpstreamControl
      .append("circle")
      .attr("r", 11)
      .attr("fill", "#1D4ED8")
      .attr("stroke", upstreamColor)
      .attr("stroke-width", 2);

    expandUpstreamControl
      .append("path")
      .attr("d", "M -4 3 L 0 -3 L 4 3")
      .attr("fill", "none")
      .attr("stroke", theme.palette.common.white)
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");

    const expandDownstreamControl = node
      .filter((d) => canExpandDownstream(d))
      .append("g")
      .attr("class", "expand-downstream-control")
      .attr("transform", (d) => `translate(0,${d.height / 2 + 18})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        autoFitNext.current = true;
        rememberNodeScreenPosition(d);
        setExpandedDownstreamIds((prev) => {
          if (prev.has(d.id)) return prev;
          const next = new Set(prev);
          next.add(d.id);
          return next;
        });
      });

    expandDownstreamControl
      .append("circle")
      .attr("r", 11)
      .attr("fill", "#166534")
      .attr("stroke", downstreamColor)
      .attr("stroke-width", 2);

    expandDownstreamControl
      .append("path")
      .attr("d", "M -4 -3 L 0 3 L 4 -3")
      .attr("fill", "none")
      .attr("stroke", theme.palette.common.white)
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");

    const portLabels = container
      .append("g")
      .attr("class", "port-labels")
      .selectAll("g")
      .data(filteredLinks)
      .join("g")
      .attr("class", "port-label-group");

    portLabels
      .append("text")
      .attr("class", "source-port")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", theme.palette.text.primary)
      .attr("font-size", 10)
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text((d) => d.sourcePort);

    portLabels
      .append("text")
      .attr("class", "target-port")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", theme.palette.text.primary)
      .attr("font-size", 10)
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text((d) => d.targetPort);

    const linkAnimations = container
      .append("g")
      .attr("class", "link-animations")
      .selectAll("circle")
      .data(filteredLinks)
      .join("circle")
      .attr("class", "link-animation")
      .attr("r", 3)
      .attr("fill", theme.palette.common.white)
      .attr("opacity", 0.9);

    // Both selections are bound to filteredLinks in order, so a link's path
    // element can be looked up by index to place labels and dots along it.
    const linkPaths = link.nodes();
    const pointAt = (index, length) => {
      const path = linkPaths[index];
      if (!path || !path.getAttribute("d")) return null;
      const total = path.getTotalLength();
      if (!total) return null;
      return path.getPointAtLength(Math.max(0, Math.min(total, length(total))));
    };

    let startTime = Date.now();
    const animateLinks = () => {
      const t = ((Date.now() - startTime) / 2000) % 1;
      linkAnimations.attr("transform", (d, i) => {
        const p = pointAt(i, (total) => t * total);
        return p ? `translate(${p.x},${p.y})` : null;
      });
      animationFrameRef.current = requestAnimationFrame(animateLinks);
    };

    function edgePoint(start, end, halfW, halfH) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9)
        return { x: start.x, y: start.y };
      if (Math.abs(dx) < 1e-9)
        return { x: start.x, y: start.y + (dy > 0 ? halfH : -halfH) };
      if (Math.abs(dy) < 1e-9)
        return { x: start.x + (dx > 0 ? halfW : -halfW), y: start.y };
      const ratio = Math.min(halfW / Math.abs(dx), halfH / Math.abs(dy));
      return { x: start.x + ratio * dx, y: start.y + ratio * dy };
    }

    // Vertical cubic: each edge leaves its source downward and arrives at the
    // target the same way, so a wide fan splays into separate readable curves
    // instead of a bundle of overlapping straight lines.
    const linkPath = (d) => {
      const s = edgePoint(d.source, d.target, d.source.width / 2, d.source.height / 2);
      const t = edgePoint(d.target, d.source, d.target.width / 2, d.target.height / 2);
      const midY = (s.y + t.y) / 2;
      return `M${s.x},${s.y}C${s.x},${midY} ${t.x},${midY} ${t.x},${t.y}`;
    };

    link.attr("d", linkPath);

    simulation.on("tick", () => {
      link.attr("d", linkPath);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);

      portLabels.each(function (d, i) {
        const offset = 16;
        const source = pointAt(i, (total) => Math.min(offset, total / 3));
        const target = pointAt(i, (total) => Math.max(total - offset, (total * 2) / 3));
        if (source) {
          d3.select(this).select(".source-port").attr("x", source.x).attr("y", source.y);
        }
        if (target) {
          d3.select(this).select(".target-port").attr("x", target.x).attr("y", target.y);
        }
      });
    });

    animateLinks();

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      filteredNodes.forEach((n) => {
        if (n !== event.subject) {
          n.fx = n.x;
          n.fy = n.y;
        }
      });
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
    }

    // zoom
    zoomBehavior.current = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    d3.select(svgRef.current)
      .call(zoomBehavior.current)
      .on("click", (event) => {
        if (event.target === svgRef.current) {
          setSelectedIds(new Set());
          setSelectedComponentId(null);
          setConnectionType(null);
          setFilteredNodes(EMPTY_FILTER.nodes);
          setFilteredLinks(EMPTY_FILTER.links);
          setHighlightedNode(null);
          syncUrl(null, null); // NEW
        }
      });

    if (autoFitNext.current) {
      // An expand keeps the clicked node put; anything else refits the graph.
      if (!keepNodeStationary(positions)) {
        fitToPositions(positions, filteredNodes);
      }
      autoFitNext.current = false;
    } else {
      setTimeout(resetView, 100);
    }

    return () => {
      simulation.stop();
      // without this each re-render leaves another rAF loop running against a
      // stale selection
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filteredNodes,
    filteredLinks,
    theme,
    highlightedNode,
    connectionType,
    selectedComponentId,
    selectedIds,
  ]);

  const renderEmptyState = () => (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        height: "calc(100% - 64px)",
        px: 3,
        textAlign: "center",
      }}
    >
      <Stack spacing={2} alignItems="center" maxWidth={700}>
        {loading ? (
          <ServerScanLoader />
        ) : (
          <>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Select a component to open its flow map
              </Typography>
            </Stack>
            <Typography variant="body1" color="text.secondary">
              The map stays focused by default. Search for a component above
              to view only its upstream services above it and downstream
              services below it.
            </Typography>
            <Autocomplete
              sx={{ width: "100%", maxWidth: 380, ...pillFieldSx(SEARCH_ACCENT) }}
              options={nodes}
              getOptionLabel={(o) => (o ? `${o.name} (${o.ip})` : "")}
              value={nodes.find((n) => n.id === selectedComponentId) || null}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onChange={(e, v) => handleSelectComponent(v?.id || null)}
              slotProps={{ paper: pillAutocompletePaperProps(SEARCH_ACCENT) }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Component"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <SearchIcon sx={{ fontSize: 18, color: SEARCH_ACCENT, ml: 0.5 }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </>
        )}
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          justifyContent="center"
        >
          <StatusChip label="Upstreams on top" color="#60A5FA" Icon={ArrowUpwardIcon} />
          <StatusChip
            label="Selected component in the middle"
            color="#E24B4A"
            Icon={AdjustIcon}
          />
          <StatusChip label="Downstreams below" color="#34D399" Icon={ArrowDownwardIcon} />
        </Stack>
        <Box
          sx={{
            width: "100%",
            maxWidth: 520,
            p: 2.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            background: (t) =>
              t.palette.mode === "light"
                ? "linear-gradient(180deg, rgba(37,99,235,0.04), rgba(34,197,94,0.04))"
                : "linear-gradient(180deg, rgba(96,165,250,0.06), rgba(52,211,153,0.06))",
            boxShadow: (t) =>
              t.palette.mode === "light"
                ? "0 8px 24px rgba(15,23,42,0.06)"
                : "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: "block",
              mb: 1.5,
              fontWeight: 700,
              letterSpacing: 1,
              color: "text.secondary",
            }}
          >
            Example flow
          </Typography>
          <Box
            component="svg"
            viewBox="0 0 480 280"
            sx={{ width: "100%", height: "auto", overflow: "visible" }}
          >
            <defs>
              <filter id="example-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="8"
                  floodColor={"#FCD34D"}
                  floodOpacity="0.55"
                />
              </filter>
              <marker
                id="example-arrow"
                viewBox="0 -5 10 10"
                refX="10"
                refY="0"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M0,-5L10,0L0,5" fill={"#F59E0B"} />
              </marker>
            </defs>

            <rect
              x="20"
              y="8"
              rx="16"
              width="180"
              height="42"
              fill={"#60A5FA"}
              stroke={"#93C5FD"}
              strokeWidth="3"
            />
            <rect
              x="280"
              y="8"
              rx="16"
              width="180"
              height="42"
              fill={"#60A5FA"}
              stroke={"#93C5FD"}
              strokeWidth="3"
            />
            <text
              x="110"
              y="33"
              textAnchor="middle"
              fill={theme.palette.common.white}
              fontSize="13"
              fontWeight="700"
              fontFamily={theme.typography.fontFamily}
            >
              Upstream A
            </text>
            <text
              x="370"
              y="33"
              textAnchor="middle"
              fill={theme.palette.common.white}
              fontSize="13"
              fontWeight="700"
              fontFamily={theme.typography.fontFamily}
            >
              Upstream B
            </text>

            <path
              id="example-upstream-a"
              d="M 110 50 L 205 108"
              stroke={"#F59E0B"}
              strokeWidth="4"
              fill="none"
              markerEnd="url(#example-arrow)"
            />
            <path
              id="example-upstream-b"
              d="M 370 50 L 275 108"
              stroke={"#F59E0B"}
              strokeWidth="4"
              fill="none"
              markerEnd="url(#example-arrow)"
            />
            <text
              x="150"
              y="78"
              textAnchor="start"
              fill={theme.palette.common.white}
              fontSize="11"
              fontWeight="700"
              fontFamily={theme.typography.fontFamily}
            >
              9021
            </text>
            <text
              x="330"
              y="78"
              textAnchor="start"
              fill={theme.palette.common.white}
              fontSize="11"
              fontWeight="700"
              fontFamily={theme.typography.fontFamily}
            >
              9022
            </text>

            <rect
              x="145"
              y="108"
              rx="18"
              width="190"
              height="60"
              fill={"#E24B4A"}
              stroke={"#FCD34D"}
              strokeWidth="5"
              filter="url(#example-glow)"
            />
            <text
              x="240"
              y="142"
              textAnchor="middle"
              fill={theme.palette.common.white}
              fontSize="14"
              fontWeight="700"
              fontFamily={theme.typography.fontFamily}
            >
              Selected Component
            </text>
            <path
              id="example-downstream-a"
              d="M 200 168 L 110 218"
              stroke={"#F59E0B"}
              strokeWidth="4"
              fill="none"
              markerEnd="url(#example-arrow)"
            />
            <path
              id="example-downstream-b"
              d="M 280 168 L 370 218"
              stroke={"#F59E0B"}
              strokeWidth="4"
              fill="none"
              markerEnd="url(#example-arrow)"
            />
            <text
              x="155"
              y="200"
              textAnchor="middle"
              fill={theme.palette.common.white}
              fontSize="11"
              fontWeight="700"
              fontFamily={theme.typography.fontFamily}
            >
              9006
            </text>
            <text
              x="325"
              y="200"
              textAnchor="middle"
              fill={theme.palette.common.white}
              fontSize="11"
              fontWeight="700"
              fontFamily={theme.typography.fontFamily}
            >
              9006
            </text>

            <circle r="3" fill={theme.palette.common.white} opacity="0.95">
              <animateMotion dur="2.2s" repeatCount="indefinite" rotate="auto">
                <mpath href="#example-upstream-a" />
              </animateMotion>
            </circle>
            <circle r="3" fill={theme.palette.common.white} opacity="0.95">
              <animateMotion dur="2.3s" repeatCount="indefinite" rotate="auto">
                <mpath href="#example-upstream-b" />
              </animateMotion>
            </circle>
            <circle r="3" fill={theme.palette.common.white} opacity="0.95">
              <animateMotion dur="2s" repeatCount="indefinite" rotate="auto">
                <mpath href="#example-downstream-a" />
              </animateMotion>
            </circle>
            <circle r="3" fill={theme.palette.common.white} opacity="0.95">
              <animateMotion dur="2.1s" repeatCount="indefinite" rotate="auto">
                <mpath href="#example-downstream-b" />
              </animateMotion>
            </circle>

            <rect
              x="20"
              y="218"
              rx="16"
              width="180"
              height="42"
              fill={"#34D399"}
              stroke={"#6EE7B7"}
              strokeWidth="3"
            />
            <rect
              x="280"
              y="218"
              rx="16"
              width="180"
              height="42"
              fill={"#34D399"}
              stroke={"#6EE7B7"}
              strokeWidth="3"
            />
            <text
              x="110"
              y="243"
              textAnchor="middle"
              fill={theme.palette.common.white}
              fontSize="13"
              fontWeight="700"
              fontFamily={theme.typography.fontFamily}
            >
              Downstream A
            </text>
            <text
              x="370"
              y="243"
              textAnchor="middle"
              fill={theme.palette.common.white}
              fontSize="13"
              fontWeight="700"
              fontFamily={theme.typography.fontFamily}
            >
              Downstream B
            </text>
          </Box>
        </Box>
      </Stack>
    </Box>
  );

  // Remove the early return for error - we'll handle it in the content area instead

  return (
    <Paper
      elevation={2}
      ref={containerRef}
      sx={{
        position: "relative",
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: theme.palette.divider,
        overflow: "hidden",
      }}
    >
      <TreeHeader
        nodes={nodes}
        selectedComponentId={selectedComponentId}
        onSelect={handleSelectComponent}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => {
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
            setIsFullscreen(true);
          } else {
            document.exitFullscreen();
            setIsFullscreen(false);
          }
        }}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onZoomIn={() =>
          d3
            .select(svgRef.current)
            .transition()
            .duration(200)
            .call(zoomBehavior.current.scaleBy, 1.5)
        }
        onZoomOut={() =>
          d3
            .select(svgRef.current)
            .transition()
            .duration(200)
            .call(zoomBehavior.current.scaleBy, 0.5)
        }
        onFit={resetView}
        onHierarchy={resetToHierarchyLayout}
        containerRef={containerRef}
        showSearch={filteredNodes.length > 0}
      />

      {filteredNodes.length > 0 ? (
        <svg
          ref={svgRef}
          width="100%"
          style={{
            overflow: "visible",
            cursor: "move",
            height: "calc(100% - 64px)",
          }}
        >
          <g ref={zoomContainerRef} />
        </svg>
      ) : (
        renderEmptyState()
      )}

      {/* Context menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        disablePortal={isFullscreen}
        container={containerRef.current}
        PaperProps={{
          sx: {
            zIndex: (t) => t.zIndex.modal + 4,
            minWidth: 200,
            borderRadius: 2,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            const node = contextMenu?.node;
            const ids =
              selectedIds.size > 1
                ? selectedIds
                : node
                  ? new Set([node.id])
                  : new Set();
            const hasImmediateConnections = [...ids].some((id) => {
              const n = nodes.find((item) => item.id === id);
              return n?.downstream?.length || n?.upstream?.length;
            });
            if (!hasImmediateConnections) {
              setSnackbar({
                open: true,
                message: "No immediate connections found.",
                severity: "warning",
              });
            } else {
              autoFitNext.current = true;
              filterConnectedForSet(ids, "immediate-all");
            }
            handleCloseContextMenu();
          }}
        >
          <DeviceHubIcon sx={{ mr: 1.25, fontSize: 20, color: "#60A5FA" }} />
          <strong>Show All Immediate Connections</strong>
        </MenuItem>

        <MenuItem
          onClick={() => {
            const node = contextMenu?.node;
            const ids =
              selectedIds.size > 1
                ? selectedIds
                : node
                  ? new Set([node.id])
                  : new Set();
            const hasImmediateUpstreams = [...ids].some(
              (id) => nodes.find((n) => n.id === id)?.upstream?.length
            );
            if (!hasImmediateUpstreams) {
              setSnackbar({
                open: true,
                message: "No immediate upstream connections found.",
                severity: "warning",
              });
            } else {
              autoFitNext.current = true;
              filterConnectedForSet(ids, "immediate-upstream");
            }
            handleCloseContextMenu();
          }}
        >
          <ArrowUpwardIcon sx={{ mr: 1.25, fontSize: 20, color: "#60A5FA" }} />
          <strong>Show Immediate Upstreams</strong>
        </MenuItem>

        <MenuItem
          onClick={() => {
            const node = contextMenu?.node;
            const ids =
              selectedIds.size > 1
                ? selectedIds
                : node
                  ? new Set([node.id])
                  : new Set();
            const hasImmediateDownstreams = [...ids].some(
              (id) => nodes.find((n) => n.id === id)?.downstream?.length
            );
            if (!hasImmediateDownstreams) {
              setSnackbar({
                open: true,
                message: "No immediate downstream connections found.",
                severity: "warning",
              });
            } else {
              autoFitNext.current = true;
              filterConnectedForSet(ids, "immediate-downstream");
            }
            handleCloseContextMenu();
          }}
        >
          <ArrowDownwardIcon
            sx={{ mr: 1.25, fontSize: 20, color: "#34D399" }}
          />
          <strong>Show Immediate Downstreams</strong>
        </MenuItem>

        <MenuItem
          onClick={() => {
            const node = contextMenu?.node;
            const ids =
              selectedIds.size > 1
                ? selectedIds
                : node
                  ? new Set([node.id])
                  : new Set();
            const hasUpstreams = [...ids].some(
              (id) => nodes.find((n) => n.id === id)?.upstream?.length
            );
            if (!hasUpstreams) {
              setSnackbar({
                open: true,
                message: "No upstream connections found.",
                severity: "warning",
              });
            } else {
              autoFitNext.current = true;
              filterConnectedForSet(ids, "upstream");
            }
            handleCloseContextMenu();
          }}
        >
          <KeyboardDoubleArrowUpIcon
            sx={{ mr: 1.25, fontSize: 20, color: "#60A5FA" }}
          />
          <strong>Show Upstreams</strong>
        </MenuItem>

        <MenuItem
          onClick={() => {
            const node = contextMenu?.node;
            const ids =
              selectedIds.size > 1
                ? selectedIds
                : node
                  ? new Set([node.id])
                  : new Set();
            const hasDownstreams = [...ids].some(
              (id) => nodes.find((n) => n.id === id)?.downstream?.length
            );
            if (!hasDownstreams) {
              setSnackbar({
                open: true,
                message: "No downstream connections found.",
                severity: "warning",
              });
            } else {
              autoFitNext.current = true;
              filterConnectedForSet(ids, "downstream");
            }
            handleCloseContextMenu();
          }}
        >
          <KeyboardDoubleArrowDownIcon
            sx={{ mr: 1.25, fontSize: 20, color: "#34D399" }}
          />
          <strong>Show Downstreams</strong>
        </MenuItem>

        <MenuItem
          onClick={() => {
            const node = contextMenu?.node;
            const ids =
              selectedIds.size > 1
                ? selectedIds
                : node
                  ? new Set([node.id])
                  : new Set();
            const hasConnections = [...ids].some((id) => {
              const n = nodes.find((n) => n.id === id);
              return n?.downstream?.length || n?.upstream?.length;
            });
            if (!hasConnections) {
              setSnackbar({
                open: true,
                message: "No connections found.",
                severity: "warning",
              });
            } else {
              autoFitNext.current = true;
              filterConnectedForSet(ids, "all");
            }
            handleCloseContextMenu();
          }}
        >
          <HubIcon sx={{ mr: 1.25, fontSize: 20, color: "#F59E0B" }} />
          <strong>Show All Connections</strong>
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ErrorModal
        wrapperRef={wrapperRef}
        open={openErrorModal}
        error={error}
        onClose={() => setOpenErrorModal(false)}
      />
    </Paper>
  );
};

export default ComponentMap;
