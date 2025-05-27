/* ComponentsSection.jsx */
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Box, Menu, MenuItem, Typography } from "@mui/material";
import ComponentsAddModal from "./ComponentsAddModal";
import ComponentsFilterBar from "./ComponentsFilterBar";
import ComponentsTable from "./ComponentsTable";
import { backendDomain } from "../../Config";
import { useData } from "../../DataContext";
import axios from "axios";

function ComponentsSection() {
  const [components, setComponents] = useState([]);
  const [filterTokens, setFilterTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState({ row: null, field: null });
  const [openModal, setOpenModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [modalInitialComponent, setModalInitialComponent] = useState(null);

  const { allRegions, platforms } = useData();

  const fetchComponents = async (fresh = false) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${backendDomain}/components/fetch-components`,
        {
          params: { fresh: fresh ? "true" : "false" },
        }
      );
      setComponents(response.data.components);
    } catch (err) {
      setError(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  const handleAddComponent = async (payload) => {
    setLoading(true);
    try {
      await axios.post(`${backendDomain}/components/sync-components`, payload);
    } catch (err) {
      setError(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
      fetchComponents(true);
    }
  };

  const handleDeleteSelectedComponent = async () => {
    if (!selectedComponent) return;
    setContextMenu(null);
    setLoading(true);
    try {
      await axios.delete(`${backendDomain}/components/delete-component`, {
        data: selectedComponent,
      });
    } catch (err) {
      setError(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
    } finally {
      setContextMenu(null);
      setSelectedComponent(null);
      fetchComponents(true);
    }
  };

  // Filter components based on tokens
  const filteredComponents = components.filter((comp) => {
    if (!filterTokens.length) return true;
    const grouped = filterTokens.reduce((acc, t) => {
      acc[t.key] = acc[t.key] || [];
      acc[t.key].push(t);
      return acc;
    }, {});
    return Object.entries(grouped).every(([key, tokens]) => {
      const values = tokens.map((t) => t.value.toLowerCase());
      const operator = tokens[0].operator;
      let prop = "";
      switch (key) {
        case "name":
          prop = (comp.component_name || "").toLowerCase();
          break;
        case "ip":
          prop = (comp.ip || "").toLowerCase();
          break;
        case "region":
          prop = (comp.region || "").toLowerCase();
          break;
        case "platform":
          prop = (comp.platform || "").toLowerCase();
          break;
        case "pipeline":
          prop = (comp.pipeline || "").toLowerCase();
          break;
        case "version":
          prop = (comp.comp_version || "").toLowerCase();
          break;
        case "release_date":
          prop = (comp.release_date || "").toLowerCase();
          break;
        default:
          return true;
      }
      return operator === "AND"
        ? values.every((v) => prop.includes(v))
        : values.some((v) => prop.includes(v));
    });
  });

  // Suggestions from filtered list
  const componentNameSuggestions = [
    ...new Set(filteredComponents.map((c) => c.component_name)),
  ];
  const ipSuggestions = [...new Set(filteredComponents.map((c) => c.ip))];

  const versionSuggestions = [
    ...new Set(filteredComponents.map((c) => c.comp_version)),
  ];

  const releaseDateSuggestions = [
    ...new Set(filteredComponents.map((c) => c.release_date)),
  ];

  const copyToClipboard = (text, rowIndex, field) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => setCopied({ row: rowIndex, field }))
        .catch(() => {});
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied({ row: rowIndex, field });
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredComponents.map((comp) => ({
      Region: comp.region,
      IP: comp.ip,
      "Component Name": comp.component_name,
      Platform: comp.platform,
      "Component Path": comp.comp_path,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Components");
    XLSX.writeFile(wb, "components.xlsx");
  };

  const handleRowContextMenu = (e, comp) => {
    e.preventDefault();
    setSelectedComponent(comp);
    setContextMenu({ mouseX: e.clientX - 2, mouseY: e.clientY - 4 });
  };
  const handleAddComponentFromContext = () => {
    if (!selectedComponent) return;
    setModalInitialComponent({
      region: selectedComponent.region,
      ip: selectedComponent.ip,
      component_name: "",
      platform: "",
      comp_path: "",
    });
    setOpenModal(true);
    setContextMenu(null);
    setSelectedComponent(null);
  };

  return (
    <Box
      sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}
      overflow="hidden"
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Component Details</Typography>
      </Box>
      <ComponentsFilterBar
        onFilterTokensChange={setFilterTokens}
        regions={allRegions}
        platforms={platforms}
        componentNameSuggestions={componentNameSuggestions}
        ipSuggestions={ipSuggestions}
        versionSuggestions={versionSuggestions}
        releaseDateSuggestions={releaseDateSuggestions}
        exportToExcel={exportToExcel}
        onRefresh={() => fetchComponents(true)}
        loading={loading}
        setOpenModal={setOpenModal}
        setModalInitialComponent={setModalInitialComponent}
      />

      <ComponentsTable
        loading={loading}
        error={error}
        filteredComponents={filteredComponents}
        copyToClipboard={copyToClipboard}
        copied={copied}
        handleRowContextMenu={handleRowContextMenu}
      />

      <Menu
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleDeleteSelectedComponent}>Delete</MenuItem>
        <MenuItem onClick={handleAddComponentFromContext}>
          Add/Modify Component
        </MenuItem>
      </Menu>

      <ComponentsAddModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setModalInitialComponent(null);
        }}
        onAdd={handleAddComponent}
        initialComponent={modalInitialComponent}
        existingComponents={components}
      />
    </Box>
  );
}

export default ComponentsSection;
