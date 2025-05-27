// EC2DetailsSection.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import EC2DetailsFilterBar from "./EC2DetailsFilterBar";
import EC2DetailsTable from "./EC2DetailsTable";
import { backendDomain } from "../../Config";
import axios from "axios";

const STATUS_OPTIONS = ["running", "stopped", "terminated"];

const EC2DetailsSection = () => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTokens, setFilterTokens] = useState([]);
  // Legacy single-value states

  const fetchInstances = async (fresh = false) => {
    setLoading(true);
    try {
      const resp = await axios.get(
        `${backendDomain}/ec2-details/fetch-instance-summary`,
        { params: { fresh: fresh ? "true" : "false" } }
      );
      setInstances(resp.data.instances);
    } catch (e) {
      setError(e.response?.data?.error_message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchInstances();
  }, []);

  // Derive suggestion lists
  const regionSuggestions = useMemo(
    () => [...new Set(instances.map((i) => i.region).filter(Boolean))],
    [instances]
  );
  const instanceTypeSuggestions = useMemo(
    () => [...new Set(instances.map((i) => i.instance_type).filter(Boolean))],
    [instances]
  );

  // // Group tokens by key
  // const grouped = filterTokens.reduce((acc, t) => {
  //   acc[t.key] = acc[t.key] || [];
  //   acc[t.key].push(t);
  //   return acc;
  // }, {});

  // Apply filtering: AND across keys, per-key AND/OR based on first token.operator
  const filteredInstances = instances.filter((inst) => {
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
          prop = inst.instance_name?.toLowerCase() || "";
          break;
        case "ip":
          prop = inst.private_ip?.toLowerCase() || "";
          break;
        case "region":
          prop = inst.region?.toLowerCase() || "";
          break;
        case "status":
          prop = inst.instance_status?.toLowerCase() || "";
          break;
        case "instance_type":
          prop = inst.instance_type?.toLowerCase() || "";
          break;
        default:
          return true;
      }
      // treat 'ALL' as wildcard
      // if (
      //   (key === "region" || key === "status" || key === "instance_type") &&
      //   values.includes("all")
      // ) {
      //   return true;
      // }
      return operator === "AND"
        ? values.every((v) => prop.includes(v))
        : values.some((v) => prop.includes(v));
    });
  });

  const nameSuggestions = [
    ...new Set(filteredInstances.map((c) => c.instance_name)),
  ];

  // this is in your Section.jsx
  const ipSuggestions = [
    ...new Set(filteredInstances.map((c) => c.private_ip)),
  ];

  return (
    <Box
      sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        EC2 Details
      </Typography>
      <EC2DetailsFilterBar
        nameSuggestions={nameSuggestions}
        ipSuggestions={ipSuggestions}
        regionSuggestions={regionSuggestions}
        statusOptions={STATUS_OPTIONS}
        instanceTypeSuggestions={instanceTypeSuggestions}
        onRefresh={() => fetchInstances(true)}
        loading={loading}
        onFilterTokensChange={setFilterTokens}
      />
      <EC2DetailsTable
        instances={filteredInstances}
        loading={loading}
        error={error}
      />
    </Box>
  );
};

export default EC2DetailsSection;
